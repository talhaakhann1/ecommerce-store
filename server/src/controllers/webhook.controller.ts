import { stripe } from "../utils/stripInstance.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { Product } from "../models/product.model.js";
import { OrderItem } from "../models/orderItem.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

import mongoose from "mongoose";

import type { Request, Response } from "express";

import { OrderStatus } from "../types/enums/order.enum.js";
import { PaymentStatus } from "../types/enums/payment.enum.js";

export const stripeWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      throw new ApiError(400, "Stripe signature is missing");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      logger.error("Stripe webhook signature verification failed", error);

      return res.status(400).send("Invalid Stripe webhook signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;

        const { orderId, userId } = checkoutSession.metadata ?? {};

        if (!orderId || !userId) {
          logger.error("Stripe checkout session metadata is missing");

          return res.sendStatus(200);
        }

        if (!checkoutSession.payment_intent) {
          logger.warn(
            `No payment intent found for checkout session ${checkoutSession.id}`
          );

          return res.sendStatus(200);
        }

        const paymentIntentId =
          typeof checkoutSession.payment_intent === "string"
            ? checkoutSession.payment_intent
            : checkoutSession.payment_intent.id;

        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== "succeeded") {
          logger.warn(
            `PaymentIntent ${paymentIntent.id} is not succeeded. Status: ${paymentIntent.status}`
          );

          return res.sendStatus(200);
        }

        if (
          !mongoose.Types.ObjectId.isValid(orderId) ||
          !mongoose.Types.ObjectId.isValid(userId)
        ) {
          logger.error("Invalid orderId or userId in Stripe metadata");

          return res.sendStatus(200);
        }

        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {

            const existingPayment = await Payment.findOne({
              transactionId: paymentIntent.id,
            }).session(session);

            if (existingPayment) {
              logger.info(
                `Stripe payment ${paymentIntent.id} already processed`
              );

              return;
            }

            const order = await Order.findOne({
              _id: orderId,
              user: userId,
            }).session(session);

            if (!order) {
              throw new ApiError(404, "Order not found");
            }

            /*
             * Another idempotency check.
             */
            if (order.isPaid || order.paymentStatus === PaymentStatus.PAID) {
              logger.info(`Order ${orderId} has already been marked as paid`);

              return;
            }

            const expectedAmount = Math.round(order.totalAmount * 100);

            if (paymentIntent.amount !== expectedAmount) {
              throw new ApiError(
                400,
                `Payment amount mismatch. Expected ${expectedAmount}, received ${paymentIntent.amount}`
              );
            }

            const orderItems = await OrderItem.find({
              order: orderId,
            }).session(session);

            if (orderItems.length === 0) {
              throw new ApiError(404, "Order items not found");
            }

            for (const item of orderItems) {
              const stockUpdate = await Product.updateOne(
                {
                  _id: item.product,

                  stock: {
                    $gte: item.quantity,
                  },

                  reservedStock: {
                    $gte: item.quantity,
                  },
                },
                {
                  $inc: {
                    stock: -item.quantity,
                    reservedStock: -item.quantity,
                  },
                },
                {
                  session,
                }
              );

              if (stockUpdate.modifiedCount === 0) {
                throw new ApiError(
                  409,
                  `Unable to finalize stock for product ${item.product}`
                );
              }
            }

            const payment = new Payment({
              orderId: order._id,
              user: new mongoose.Types.ObjectId(userId),
              amount: paymentIntent.amount / 100,
              transactionId: paymentIntent.id,
              paymentMethod: "stripe",
              status: PaymentStatus.PAID,
              paidAt: new Date(),
            });

            await payment.save({ session });

            order.isPaid = true;

            order.paymentStatus = PaymentStatus.PAID;

            order.orderStatus = OrderStatus.PAID;

            order.placedAt = new Date();

            await order.save({
              session,
            });

            logger.info(
              `Stripe payment processed successfully for order ${orderId}`
            );
          });


          return res.sendStatus(200);
        } catch (error) {


          logger.error(
            `Stripe webhook processing failed for order ${orderId}`,
            error
          );

          return res.sendStatus(500);
        } finally {
          await session.endSession();
        }
      }

      default: {
        logger.info(`Unhandled Stripe webhook event: ${event.type}`);

        return res.sendStatus(200);
      }
    }
  }
);
