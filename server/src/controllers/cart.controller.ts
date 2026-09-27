import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import type { Request, Response } from "express";

const getUserCart = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user._id;

    const [cart] = await Cart.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $lookup: {
          from: "cartitems",
          localField: "items",
          foreignField: "_id",
          as: "items",

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
                      title: 1,
                      description: 1,
                      stock: 1,
                      category: 1,
                      originalPrice: 1,
                      finalPrice: 1,
                      images: 1,
                    },
                  },
                ],
              },
            },

            {
              $unwind: "$product",
            },

            {
              $project: {
                _id: 0,
                id: {
                  $toString: "$_id",
                },
                quantity: 1,
                product: 1,
              },
            },
          ],
        },
      },

      {
        $project: {
          _id: 0,

          id: {
            $toString: "$_id",
          },

          items: 1,
          totalAmount: 1,
        },
      },
    ]);

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cart,
          "Successfully retrieved user cart"
        )
      );
  }
);

export { getUserCart };