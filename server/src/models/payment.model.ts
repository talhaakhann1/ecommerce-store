import mongoose, { Model, Schema } from "mongoose";
import { PaymentStatus } from "../types/enums/payment.enum.js";
import type { IPayment } from "../interfaces/payment.interface.js";

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    transactionId: {
      type: String,
      required: true,
      unique:true
    },
    paymentMethod: {
      type: String,
      enum: ["stripe"],
      required: true
    },
    status: {
      type: String,
      enum: PaymentStatus,
      default:PaymentStatus.PENDING,
      required: true
    },
    paidAt: {
      type: Date,
      index: true
    }
  },
  { timestamps: true }
);


export const Payment:Model<IPayment> = mongoose.model<IPayment>("Payment", paymentSchema)