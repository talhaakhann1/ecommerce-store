import mongoose, { Model, Schema } from "mongoose";
import type { IProduct } from "../interfaces/product.interface.js";

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      require: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: String,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    isDiscountActive: {
      type: Boolean,
      required: true,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    images: [
      {
        url: {
          type: String,
          default: `https://via.placeholder.com/200x200.png`,
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],
    discountedPrice: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    reservedStock: { type: Number, default: 0 },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    brand: {
      type: String,
      required: true,
    },
    isPublished: {
      type: Boolean,
      required: true,
    },
    ratingAverage: {
      type: Number,
      required: true,
      default: 0,
    },
    ratingCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);
