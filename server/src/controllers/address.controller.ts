import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Address } from "../models/address.model.js";
import { User } from "../models/user.model.js";

const addAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, country, city, postalCode, addressLine } = req.body;

  const userId = req.user._id;

  const addressDetails: Record<string, unknown> = {};

  if (fullName) addressDetails.fullName = fullName;
  if (phone) addressDetails.phone = phone;
  if (country) addressDetails.country = country;
  if (city) addressDetails.city = city;
  if (postalCode) addressDetails.postalCode = postalCode;
  if (addressLine) addressDetails.addressLine = addressLine;

 const updatedAddress = await Address.findOneAndUpdate(
  { user: userId },
  {
    $set: {
      ...addressDetails,
      user: userId,
    },
  },
  {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  }
);

  if (!updatedAddress) {
    throw new ApiError(404, "Address not found or failed to update");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully created the address"));
});

const getUserAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [address] = await Address.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 0,
        id: {
          $toString: "$_id",
        },
        fullName: 1,
        phone: 1,
        country: 1,
        city: 1,
        postalCode: 1,
        addressLine: 1,
      },
    },
  ]);

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, address, "Successfully get the user address"));
});

export { addAddress, getUserAddress };
