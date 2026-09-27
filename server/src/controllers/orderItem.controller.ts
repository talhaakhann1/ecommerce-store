import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import { CartItem } from "../models/cartItem.model.js";
import { Cart } from "../models/cart.model.js";
import { OrderItem } from "../models/orderItem.model.js";
import { Order } from "../models/order.model.js";
import logger from "../utils/logger.js";
import { Product } from "../models/product.model.js";
import type { Request,Response } from "express";

const getOrderItemsByOrderId = asyncHandler(async (req:Request, res:Response) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  });

  if (!order) {
    throw new ApiError(404, "Order does not exist");
  }

  const orderItems = await OrderItem.aggregate([
    {
      $match: {
        order: order._id,
        user:userId
      },
    },
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
              title: 1,
              description: 1,
              originalPrice: 1,
              images: 1,
              discount: 1,
              discountValue: 1,
              finalPrice: 1,
              category: 1,
              stock: 1,
              brand: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "orders",
        localField: "order",
        foreignField: "_id",
        as: "order",
        pipeline: [
          {
            $project: {
              _id: 0,
              id: {
                $toString: "$_id",
              },
            },
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
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$order",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        id: {
          $toString: "$_id",
        },
        user: 1,
        product: 1,
        order: 1,
        quantity: 1,
        price: 1,
      },
    },
  ]);


  return res
    .status(200)
    .json(new ApiResponse(200, orderItems||[], "Successfully fetched order items"));
});

export { getOrderItemsByOrderId };