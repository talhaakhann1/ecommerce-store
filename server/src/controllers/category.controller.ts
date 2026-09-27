import slugify from "slugify";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import { deleteAtCloudinary, uploadAtCloudinary } from "../utils/cloudinary.js";
import type { Request, Response } from "express";

const createCategory = asyncHandler(async (req:Request, res:Response) => {
  const { name, description } = req.body;

  const existedCategory=await Category.findOne({
    name
  })

  if(existedCategory){
    throw new ApiError(409,"category with this name already existed")
  }

  if (!req.file) {
    throw new ApiError(400, "image file is required");
  }

  const imagePath = req.file.path;

  if (!imagePath) {
    throw new ApiError(400, "imagePath not found");
  }

  const uploadedImage = await uploadAtCloudinary(imagePath, {
    type: "thumbnail",
  });

  if (!uploadedImage) {
    throw new ApiError(400, "Uploaded image is not defined");
  }

  const category = await Category.create({
    name,
    description,
    image: {
      url: uploadedImage.secure_url,
      publicId: uploadedImage.public_id,
    },
    slug: slugify(name, { lower: true }),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Successfully created the category"));
});

const updateCategory = asyncHandler(async (req:Request, res:Response) => {
  const { name, description } = req.body;
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new ApiError(400, "categoryId is required");
  }

  const existedCategory = await Category.findById(categoryId);

  if (!existedCategory) {
    throw new ApiError(404, "Category does not exist");
  }

  const updatedData: Record<string, any> = {};

  if (name !== undefined) {
    updatedData.name = name;
    updatedData.slug = slugify(name, { lower: true });
  }

  if (description !== undefined) {
    updatedData.description = description;
  }

  if (req.file) {
    const imagePath = req.file.path;

    if (!imagePath) {
      throw new ApiError(400, "imagePath not found");
    }

    const uploadedImage = await uploadAtCloudinary(imagePath, {
      type: "thumbnail",
    });

    if (!uploadedImage) {
      throw new ApiError(400, "Uploaded image is not defined");
    }

    if (existedCategory.image?.publicId) {
      await deleteAtCloudinary(existedCategory.image.publicId, "image");
    }

    updatedData.image = {
      url: uploadedImage.secure_url,
      publicId: uploadedImage.public_id,
    };
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    {
      $set: updatedData,
    },
    {
      new: true,
    }
  );

  if (!updatedCategory) {
    throw new ApiError(400, "Something went wrong in updating category");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCategory, "Successfully updated the category"));
});


const removeCategory = asyncHandler(async (req:Request, res:Response) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new ApiError(400, "categoryId is required");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (category.image?.publicId) {
    await deleteAtCloudinary(category.image.publicId, "image");
  }

  await Category.findByIdAndDelete(categoryId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the category"));
});

export { createCategory, updateCategory, removeCategory };