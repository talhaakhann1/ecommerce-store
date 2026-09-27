import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { stripe } from "../utils/stripInstance.js";
import mongoose, { type PipelineStage } from "mongoose";
import type { Request, Response } from "express";
import { Product } from "../models/product.model.js";
import { OrderItem } from "../models/orderItem.model.js";

function commonPaymentAggregation(): PipelineStage[] {
  return [
    {
      $project: {
        _id: 0,
        id: {
          $toString: "$_id",
        },
        user: 1,
        orderId: 1,
        amount: 1,
        transactionId: 1,
        paymentMethod: 1,
        status: 1,
        paidAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];
}

const createPaymentSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const userId = req.user._id;

    if (!orderId) {
      throw new ApiError(
        400,
        "Order id is required"
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      throw new ApiError(
        404,
        "Order not found"
      );
    }

    if (order.isPaid) {
      throw new ApiError(
        400,
        "Order is already paid"
      );
    }

    /*
     * Get ALL order items
     */
    const orderItems = await OrderItem.find({
      order: order._id,
      user: userId,
    });

    if (!orderItems.length) {
      throw new ApiError(
        404,
        "Order items not found"
      );
    }

    /*
     * Extract PRODUCT ids
     */
    const productIds = orderItems.map(
      (item) => item.product
    );

    /*
     * Fetch all products at once
     */
    const products = await Product.find({
      _id: {
        $in: productIds,
      },
    });

    /*
     * Make product lookup fast
     *
     * productId → product
     */
    const productMap = new Map(
      products.map((product) => [
        product._id.toString(),
        product,
      ])
    );

    /*
     * Validate products + stock
     */
    for (const item of orderItems) {
      const product = productMap.get(
        item.product.toString()
      );

      if (!product) {
        throw new ApiError(
          404,
          `Product ${item.product} not found`
        );
      }

      const availableStock =
        product.stock -
        (product.reservedStock || 0);

      if (availableStock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for ${product.title}`
        );
      }
    }

    /*
     * Convert OrderItems into Stripe line items
     */
    const lineItems = orderItems.map(
      (item) => {
        const product = productMap.get(
          item.product.toString()
        );

        if (!product) {
          throw new ApiError(
            404,
            "Product not found"
          );
        }

        return {
          price_data: {
            currency: "usd",

            product_data: {
              name: product.title,

              description:
                product.description,
            },

            unit_amount: Math.round(
              product.finalPrice * 100
            ),
          },

          quantity: item.quantity,
        };
      }
    );

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: [
          "card",
        ],

        metadata: {
          orderId:
            order._id.toString(),

          userId:
            userId.toString(),
        },

        line_items: lineItems,

        payment_intent_data: {
          metadata: {
            orderId:
              order._id.toString(),

            userId:
              userId.toString(),
          },
        },

        success_url:
          `${process.env.CLIENT_URL}` +
          `/payment/success?orderId=${order._id}`,

        cancel_url:
          `${process.env.CLIENT_URL}` +
          `/checkout/${order._id}`,
      });

    order.checkoutSessionId =
      checkoutSession.id;

    await order.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          url: checkoutSession.url,
        },
        "Checkout session created successfully"
      )
    );
  }
);

const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params;

  if (!paymentId || Array.isArray(paymentId)) {
    throw new ApiError(400, "Valid paymentId is required");
  }

  if (!paymentId) {
    throw new ApiError(400, "paymentId is required");
  }
  const [payment] = await Payment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(paymentId),
      },
    },
    ...commonPaymentAggregation(),
  ]);
  if (!payment) {
    throw new ApiError(400, "payment not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, payment, "Successfully get payment by id"));
});

const getAllPayment = asyncHandler(async (_, res:Response) => {

  const payment = await Payment.aggregate([
    {
      $match: {},
    },
    ...commonPaymentAggregation(),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, payment || [], "Successfully get userPayment"));
});

export { createPaymentSession, getPaymentById,getAllPayment };
