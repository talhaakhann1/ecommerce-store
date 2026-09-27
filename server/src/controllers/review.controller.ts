import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Review } from "../models/review.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { Types, type PipelineStage } from "mongoose";
import type { Network } from "node:inspector";
import type { Request, Response } from "express";

function commonReviewAggregation(): PipelineStage[] {
  return [
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
              avatar: 1,
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
      $project: {
        _id: 0,
        id: {
          $toString: "$_id",
        },
        comment: 1,
        user:1,
        rating: 1,
      },
    },
  ];
}

const createReview = asyncHandler(async (req:Request, res:Response) => {
  const { comment, rating } = req.body;
  const { productId } = req.params;

  const userId = req.user._id;

  if (!productId || Array.isArray(productId)) {
    throw new ApiError(400, "Valid paymentId is required");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const review = await Review.create({
    user: new mongoose.Types.ObjectId(userId),
    comment,
    rating,
    product: new mongoose.Types.ObjectId(productId),
  });

  if (!review) {
    throw new ApiError(400, "Something went wrong in posting review");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, {}, "Successfully created the review"));
});

const deleteReview = asyncHandler(async (req:Request, res:Response) => {
  const { reviewId } = req.params;

  if (!reviewId) {
    throw new ApiError(400, "reviewId is required");
  }

  const userId = req.user._id;

  const deletedReview = await Review.findOneAndDelete({
    user: new mongoose.Types.ObjectId(userId),
    _id: reviewId,
  });

  if (!deletedReview) {
    throw new ApiError(400, "Review not exist or access denied");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the review"));
});

const getProductReviews = asyncHandler(async (req:Request, res:Response) => {
  const { productId } = req.params;

  if (!productId || Array.isArray(productId)) {
    throw new ApiError(400, "Valid paymentId is required");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const reviews = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
      },
    },
    ...commonReviewAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        reviews || [],
        "Successfully get the product reviews"
      )
    );
});

export { createReview, deleteReview, getProductReviews };
