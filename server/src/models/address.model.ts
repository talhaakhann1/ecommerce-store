import mongoose, { Model, Schema } from "mongoose";
import type { IAddress } from "../interfaces/address.interface.js";

const addressSchema = new Schema<IAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    addressLine: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

export const Address: Model<IAddress> = mongoose.model<IAddress>(
  "Address",
  addressSchema
);
