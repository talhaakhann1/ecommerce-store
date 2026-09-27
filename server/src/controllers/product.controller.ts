import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteAtCloudinary, uploadAtCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { type PipelineStage } from "mongoose";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import logger from "../utils/logger.js";
import redisClient from "../config/redis.js";
import type { Request, Response } from "express";

function commonProductAggregation(): PipelineStage[] {
  return [
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "product",
        as: "productReviews",
      },
    },
    {
      $addFields: {
        totalReviews: {
          $size: "$productReviews",
        },

        totalRating: {
          $sum: "$productReviews.rating",
        },

        ratingAverage: {
          $ifNull: [
            {
              $avg: "$productReviews.rating",
            },
            0,
          ],
        },

        reviewComments: {
          $map: {
            input: "$productReviews",
            as: "review",
            in: "$$review.comment",
          },
        },
      },
    },

    {
      $project: {
        _id: 0,

        id: {
          $toString: "$_id",
        },

        title: 1,
        description: 1,
        brand: 1,
        category: 1,
        stock: 1,
        originalPrice: 1,

        totalReviews: 1,
        totalRating: 1,
        reviewComments: 1,
        ratingAverage: 1,
      },
    },
  ];
}

const addProduct = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, brand, category, stock, originalPrice } =
    req.body;

  const userId = req.user._id;

  const existedProduct=await Product.findOne({
    title,
  })

  if(existedProduct){
    throw new ApiError(409,"product with this title already existed")
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "Image files are required");
  }

  let uploadedImages: any[] = [];

  const files = req.files as Express.Multer.File[] | undefined;

  if (files && files.length > 0) {
    const imagePaths: string[] = files.map((file) => file.path);

    if (imagePaths.length === 0) {
      throw new ApiError(400, "Failed to parse image file paths");
    }

    uploadedImages = await Promise.all(
      imagePaths.map((path: string) =>
        uploadAtCloudinary(path, {
          type: "thumbnail",
        })
      )
    );
  }

  const imageUrls = uploadedImages.map((img) => ({
    url: img.secure_url,
    publicIds: img.public_id,
  }));

  if (!imageUrls) {
    throw new ApiError(400, "imageUrls urls are not defined");
  }

  const createdProduct = await Product.create({
    title,
    description,
    brand,
    seller: userId,
    originalPrice,
    finalPrice: originalPrice,
    discount: null,
    discountValue: 0,
    discountedPrice: 0,
    isDiscountActive: false,
    images: imageUrls,
    category,
    stock,
    isPublished: false,
    ratingCount: 0,
    ratingAverage: 0,
  });

  if (!createdProduct) {
    throw new ApiError(400, "Something went wrong in creating product");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, {}, "Successfully created the product"));
});

const updateProductDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { title, description, brand, category, stock, originalPrice } =
      req.body;
    const { productId } = req.params;

    const userId = req.user._id;

    if (!productId) {
      throw new ApiError(400, "productId is required");
    }

    let updateData: Record<string, any> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (brand !== undefined) updateData.brand = brand;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (stock !== undefined) updateData.stock = stock;
    if (category !== undefined) updateData.category = category;

    const existedProduct = await Product.findOne({
      _id: productId,
      seller: userId,
    });

    if (!existedProduct) {
      throw new ApiError(404, "product does not exist");
    }

    const files = req.files as Express.Multer.File[] | undefined;

    let uploadedImages: any[] = [];

    if (files && files.length > 0) {
      const imagePaths: string[] = files.map((file) => file.path);
      if (imagePaths.length === 0) {
        throw new ApiError(400, "Failed to parse image file paths");
      }
      uploadedImages = await Promise.all(
        imagePaths.map((path: string) =>
          uploadAtCloudinary(path, {
            type: "thumbnail",
          })
        )
      );
      if (!uploadedImages || uploadedImages.length === 0) {
        throw new ApiError(400, "Uploaded images are not defined");
      }

      const imageUrls = uploadedImages.map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));

      if (imageUrls.length === 0) {
        throw new ApiError(400, "Image URLs are not defined");
      }

      if (existedProduct.images && existedProduct.images.length > 0) {
        await Promise.all(
          existedProduct.images.map((image) =>
            deleteAtCloudinary(image.publicId, "image")
          )
        );
      }

      updateData.images = imageUrls;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $set: updateData,
      },
      { new: true }
    );

    if (!updatedProduct) {
      throw new ApiError(404, "Product not found or you are not authorized");
    }

    await redisClient.del("products:*");
    await redisClient.del(`product:${productId}`);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully updating the product"));
  }
);

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const userId = req.user._id;

  const deletedProduct = await Product.findOneAndDelete({
    seller: new mongoose.Types.ObjectId(userId),
    _id: productId,
  });

  if (!deletedProduct) {
    throw new ApiError(400, "Something went wrong in deleting the product");
  }

  logger.warn(`Product deleted: ${productId} by admin ${req.user._id}`);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the product"));
});

const applyingDiscountedPrice = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { discountPercentage } = req.body;

  const userId = req.user._id;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (
    discountPercentage === undefined ||
    discountPercentage <= 0 ||
    discountPercentage > 90
  ) {
    throw new ApiError(400, "Invalid discount percentage");
  }

  const product = await Product.findById({
    _id: productId,
    seller: userId,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const finalPrice =
    product.originalPrice - (product.originalPrice * discountPercentage) / 100;

  product.finalPrice = finalPrice;
  product.discount = "PERCENT";
  product.discountValue = discountPercentage;
  product.isDiscountActive = true;

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Discount applied successfully"));
});

const removingDiscountedPrice = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const userId = req.user._id;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const product = await Product.findById({
    _id: productId,
    seller: userId,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  product.finalPrice = product.originalPrice;
  product.discount = null;
  product.discountValue = 0;
  product.isDiscountActive = false;

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Discount removed successfully"));
});

const getSellerProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const products = await Product.aggregate([
    {
      $match: {
        seller: new mongoose.Types.ObjectId(userId),
      },
    },
    ...commonProductAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, products || [], "Successfully get the userProducts")
    );
});

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!productId || Array.isArray(productId)) {
    throw new ApiError(400, "Valid productId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid productId");
  }

  // const cacheKey = `product:${productId}`;
  // const cachedProduct = await redisClient.get(cacheKey);
  // if (cachedProduct) {
  //   return res
  //     .status(200)
  //     .json(
  //       new ApiResponse(
  //         200,
  //         JSON.parse(cachedProduct),
  //         "Successfully fetched product"
  //       )
  //     );
  // }

  const [product] = await Product.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(productId),
      },
    },
    ...commonProductAggregation()
  ]);

  console.log(product)

  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  // await redisClient.setEx(cacheKey, 60, JSON.stringify(product));
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Successfully fetched product"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const page = typeof req.query.page === "string" ? req.query.page : "1";
  const limit = typeof req.query.limit === "string" ? req.query.limit : "10";
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const sortBy =
    typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
  const sortType = req.query.sortType === "asc" ? "asc" : "desc";

  const cacheKey = `products:
    page=${page} 
    limit=${limit} 
    query${query || 0}
    sortBy=${sortBy || 0}
    sortType=${sortType}
    `;

  const cachedProducts = await redisClient.get(cacheKey);
  if (cachedProducts) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(cachedProducts),
          "Successfully fetched all Products"
        )
      );
  }

  const filter: Record<string, any> = {};

  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { brand: { $regex: query, $options: "i" } },
    ];
  }

  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortType === "asc" ? 1 : -1;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const products = await Product.aggregate([
    {
      $match: filter,
    },

    {
      $sort: sort,
    },

    {
      $skip: skip,
    },

    {
      $limit: limitNum,
    },

    ...commonProductAggregation(),
  ]);

  await redisClient.setEx(cacheKey, 60, JSON.stringify(products));

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Successfully fetched all Products "));
});

const getProductByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  if (!categoryId) {
    throw new ApiError(400, "categoryId is required");
  }

  if (!categoryId || Array.isArray(categoryId)) {
    throw new ApiError(400, "Valid categoryId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid categoryId");
  }

  const products = await Product.aggregate([
    {
      $match: {
        category: new mongoose.Types.ObjectId(categoryId),
      },
    },
    ...commonProductAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, products || [], "Successfully fetched Products ")
    );
});

export {
  addProduct,
  getAllProducts,
  updateProductDetails,
  removingDiscountedPrice,
  deleteProduct,
  applyingDiscountedPrice,
  getSellerProducts,
  getProductById,
  getProductByCategory,
};
