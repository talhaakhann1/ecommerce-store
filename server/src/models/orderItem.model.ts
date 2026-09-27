import mongoose, { Model, Schema } from "mongoose";
import type { IOrderItems } from "../interfaces/orderItem.model.js";


const orderItemSchema = new Schema<IOrderItems>({
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "user"
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: "Order"
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




export const OrderItem:Model<IOrderItems> = mongoose.model<IOrderItems>("OrderItem", orderItemSchema)