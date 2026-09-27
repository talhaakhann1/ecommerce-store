import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { CartItem } from "../models/cartItem.model.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import type { Request, Response } from "express";
import mongoose from "mongoose";

const addItemsToCart = asyncHandler(
  async (req: Request, res: Response) => {
    const { quantity } = req.body;
    const { productId } = req.params;

    const userId = req.user._id;

    if (!quantity || quantity <= 0) {
      throw new ApiError(
        400,
        "Quantity must be greater than 0"
      );
    }

    if (!productId) {
      throw new ApiError(
        400,
        "ProductId is required"
      );
    }

    const product = await Product.findById(productId).select(
      "finalPrice stock"
    );

    if (!product) {
      throw new ApiError(
        404,
        "Product does not exist"
      );
    }

    if (product.stock < quantity) {
      throw new ApiError(
        400,
        "Not enough stock"
      );
    }

    const unitPrice = product.finalPrice;

    const newItemTotal =
      unitPrice * quantity;

    const cart = await Cart.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $setOnInsert: {
          user: userId,
          items: [],
          totalAmount: 0,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    if (!cart) {
      throw new ApiError(
        500,
        "Failed to get or create cart"
      );
    }

    const existingCartItem =
      await CartItem.findOne({
        cart: cart._id,
        product: productId,
        user: userId,
      });

    let amountDifference: number;

    let cartItem;

    if (existingCartItem) {

      const oldItemTotal =
        existingCartItem.price;

      amountDifference =
        newItemTotal - oldItemTotal;

      existingCartItem.quantity =
        quantity;

      existingCartItem.price =
        newItemTotal;

      cartItem =
        await existingCartItem.save();
    }

    else {
      cartItem = await CartItem.create({
        cart: cart._id,
        product: product._id,
        user: userId,
        quantity,
        price: newItemTotal,
      });

      amountDifference =
        newItemTotal;
    }

    await Cart.findByIdAndUpdate(
      cart._id,
      {
        $addToSet: {
          items: cartItem._id,
        },

        $inc: {
          totalAmount:
            amountDifference,
        },
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Successfully added item to cart"
        )
      );
  }
);
const removeItemFromCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const { productId, cartId } = req.params;

  if (!productId) {
    throw new ApiError(400, "Product id is required");
  }

  if (!cartId) {
    throw new ApiError(400, "Cart id is required");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const cartItem = await CartItem.findOne({
        product: productId,
        cart: cartId,
        user: userId,
      }).session(session);

      if (!cartItem) {
        throw new ApiError(404, "Cart item does not exist");
      }

      const itemTotal = cartItem.price;

      console.log(itemTotal);

      const cart = await Cart.findOneAndUpdate(
        {
          _id: cartId,
          user: userId,
        },
        {
          $pull: {
            items: cartItem._id,
          },

          $inc: {
            totalAmount: -itemTotal,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!cart) {
        throw new ApiError(404, "Cart does not exist");
      }

      await cartItem.deleteOne({
        session,
      });
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully removed item from cart"));
  } finally {
    await session.endSession();
  }
});

export { addItemsToCart, removeItemFromCart };
