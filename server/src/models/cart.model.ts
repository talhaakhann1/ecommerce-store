import mongoose, { Model, Schema } from "mongoose";
import type { ICart } from "../interfaces/cart.interface.js";

const cartSchema = new Schema<ICart>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    items: [
        {
            type: Schema.Types.ObjectId,
            ref: "CartItems"
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    }
}, { timestamps: true })

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema)