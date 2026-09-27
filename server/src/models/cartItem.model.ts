import mongoose, { Model, Schema } from "mongoose";
import type { ICartItem } from "../interfaces/cartItem.interface.js";

const cartItemsSchema = new Schema<ICartItem>({
    cart: {
        type: Schema.Types.ObjectId,
        ref: "Cart"
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, { timestamps: true })

export const CartItem:Model<ICartItem> = mongoose.model<ICartItem>("CartItem", cartItemsSchema)