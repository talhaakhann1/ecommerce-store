import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { OrderItem } from "../models/orderItem.model.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import mongoose from "mongoose";
import { Address } from "../models/address.model.js";
import logger from "../utils/logger.js";
import { CartItem } from "../models/cartItem.model.js";
import { Product } from "../models/product.model.js";
import type { PipelineStage } from "mongoose";
import type { Request, Response } from "express";
import { OrderStatus } from "../types/enums/order.enum.js";
import { PaymentStatus } from "../types/enums/payment.enum.js";

function commonOrderAggregation(): PipelineStage[] {
  return [
    {
      $lookup: {
        from: "orderitems",
        localField: "_id",
        foreignField: "order",
        as: "orderItems",
        pipeline: [
          {
            $lookup: {
              from: "products",
              localField: "product",
              foreignField: "_id",
              as: "product",
              pipeline: [
                {
                  $project: {
                    _id: 0,
                    id: {
                      $toString: "$_id",
                    },
                    name: 1,
                    image: 1,
                    finalPrice: 1,
                    category: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$product",
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 0,
              id: {
                $toString: "$_id",
              },
              username: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "shippingaddresses",
        localField: "shippingAddress",
        foreignField: "_id",
        as: "shippingAddress",
        pipeline: [
          {
            $project: {
              _id: 0,
              id: {
                $toString: "$_id",
              },
              fullName: 1,
              phone: 1,
              addressLine: 1,
              city: 1,
              state: 1,
              postalCode: 1,
              country: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$shippingAddress",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        totalAmount: { $sum: "$orderItems.price" },
        totalItems: { $size: "$orderItems" },
      },
    },
    {
      $project: {
        _id: 0,
        id: {
          $toString: "$_id",
        },
        user: 1,
        shippingAddress: 1,
        orderItems: 1,
        totalAmount: 1,
        totalItems: 1,
        orderStatus: 1,
        isPaid: 1,
        paidAt: 1,
        placedAt: 1,
        checkoutSessionId: 1,
        expiresAt: 1,
        canceledAt: 1,
      },
    },
  ];
}

const userCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { cartId, addressId } = req.params;
  const userId = req.user._id;

  if (!cartId) {
    throw new ApiError(400, "cartId is required");
  }

  if (!addressId) {
    throw new ApiError(400, "addressId is required");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const cart = await Cart.findOne({
      _id: cartId,
      user: userId,
    }).session(session);

    if (!cart) {
      throw new ApiError(404, "Cart does not exist");
    }

    const shippingAddress = await Address.findOne({
      _id: addressId,
      user: userId,
    }).session(session);

    if (!shippingAddress) {
      throw new ApiError(404, "Address does not exist");
    }

    const cartItems = await CartItem.find({
      cart: cart._id,
      user: userId,
    }).session(session);

    if (!cartItems.length) {
      throw new ApiError(400, "Cart is empty");
    }

    const productIds = cartItems.map((item) => item.product);

    const products = await Product.find({
      _id: { $in: productIds },
    })
      .select("title stock reservedStock")
      .session(session);

    const productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );

    const stockUpdates = [];

    for (const item of cartItems) {
      const product = productMap.get(item.product.toString());

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const availableStock = product.stock - (product.reservedStock || 0);

      if (availableStock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for product ${product.title}`
        );
      }

      stockUpdates.push({
        updateOne: {
          filter: {
            _id: product._id,
            $expr: {
              $gte: [
                {
                  $subtract: [
                    "$stock",
                    {
                      $ifNull: ["$reservedStock", 0],
                    },
                  ],
                },
                item.quantity,
              ],
            },
          },
          update: {
            $inc: {
              reservedStock: item.quantity,
            },
          },
        },
      });
    }

    if (stockUpdates.length > 0) {
      const stockResult = await Product.bulkWrite(stockUpdates, { session });

      if (stockResult.modifiedCount !== cartItems.length) {
        throw new ApiError(400, "Some products are no longer available");
      }
    }

    const [order] = await Order.create(
      [
        {
          user: userId,
          shippingAddress: shippingAddress._id,
          orderItem: [],
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: cart.totalAmount,
          isPaid: false,
          placedAt: new Date(),
        },
      ],
      { session }
    );

    if (!order) {
      throw new ApiError(404, "Something went wrong in creating order");
    }

    const orderItemsPayload = cartItems.map((item) => ({
      order: order._id,
      product: item.product,
      user: userId,
      quantity: item.quantity,
      price: item.price,
    }));

    const orderItems = await OrderItem.insertMany(orderItemsPayload, {
      session,
    });

    const orderItemIds = orderItems.map((item) => item._id);

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          orderItem: orderItemIds,
        },
      },
      {
        new: true,
        session,
      }
    );

    if (!updatedOrder) {
      throw new ApiError(400, "Failed to update order");
    }

    await CartItem.deleteMany({
      cart: cart._id,
      user: userId,
    }).session(session);

    await Cart.findByIdAndUpdate(
      cart._id,
      {
        $set: {
          items: [],
          totalPrice: 0,
        },
      },
      { session }
    );

    await session.commitTransaction();

    logger.info(
      `User checkout successfully: order ${order._id} by user ${userId}`
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedOrder,
          "Checkout successful. Order is pending."
        )
      );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!orderId || Array.isArray(orderId)) {
    throw new ApiError(400, "Valid paymentId is required");
  }

  const order = await Order.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(orderId) },
    },
    ...commonOrderAggregation(),
  ]);

  if (!order.length) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order[0], "Order retrieved successfully"));
});

const getUserOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const orders = await Order.aggregate([
    {
      $match: { user: userId },
    },
    ...commonOrderAggregation(),
  ]);
  if (!orders.length) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Successfully fetched userOrder"));
});

const getAllOrders = asyncHandler(async (_, res: Response) => {
  const orders = await Order.aggregate([
    {
      $match: {},
    },
    ...commonOrderAggregation(),
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, orders || [], "Successfully fetched userOrder"));
});

const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    }).session(session);

    if (!order) {
      throw new ApiError(404, "Order does not exist");
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw new ApiError(400, "Order cannot be cancelled");
    }

    const orderItems = await OrderItem.find({
      order: order._id,
      user: userId,
    }).session(session);

    if (!orderItems.length) {
      throw new ApiError(400, "Order items do not exist");
    }

    const stockUpdates = orderItems.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
        },
        update: {
          $inc: {
            reservedStock: -item.quantity,
          },
        },
      },
    }));

    await Product.bulkWrite(stockUpdates, { session });

    order.orderStatus = OrderStatus.cANCELLED;
    order.canceledAt = new Date();

    await order.save({ session });

    await session.commitTransaction();

    logger.info(
      `User cancelled order successfully: order ${order._id} by user ${userId}`
    );

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order cancelled successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export { userCheckout, getAllOrders, cancelOrder, getOrderById, getUserOrder };
