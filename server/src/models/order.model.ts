import mongoose, { Model, Schema } from "mongoose";
import { PaymentStatus } from "../types/enums/payment.enum.js";
import { OrderStatus } from "../types/enums/order.enum.js";
import type { IOrder } from "../interfaces/order.interface.js";

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    orderItem: [
      {
        type: Schema.Types.ObjectId,
        ref: "orderItem",
      },
    ],
    shippingAddress: {
      type: Schema.Types.ObjectId,
      ref: "address",
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: PaymentStatus,
      default: PaymentStatus.PENDING,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: OrderStatus,
      default: OrderStatus.PENDING,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
      index: true,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    checkoutSessionId: {
      type: String,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    canceledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Order:Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);
