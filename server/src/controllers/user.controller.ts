import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteAtCloudinary, uploadAtCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import crypto from "crypto";
import type { Types } from "mongoose";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import type { TokenPayload } from "../types/global.js";

const generateAccessAndRefreshToken = async (userId: Types.ObjectId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(400, "User does not exist");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken!;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists");
  }

  const user = await User.create({
    email,
    password,
    username: username.toLowerCase(),
    isActive: false,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    email,
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordValid(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid user credentials");
  }

  const [loggedInUser] = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        fullName: 1,
        email: 1,
        status: 1,
        role: 1,
        title: 1,
        bio: 1,
        avatar: 1,
      },
    },
  ]);

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const accessTokenMaxAge = 7 * 24 * 60 * 60 * 1000;
  const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000;

  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };

  logger.info(`User login Successfully: ${user._id} `);

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: accessTokenMaxAge,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenMaxAge,
    })
    .json(new ApiResponse(200, loggedInUser, "Successfully loggedIn user"));
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshToken: 1,
      },
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };

  logger.info(`User logout Successfully: ${user._id} `);

  return res
    .status(200)
    .clearCookie("accessToken", {
      ...cookieOptions,
    })
    .clearCookie("refreshToken", {
      ...cookieOptions,
    })
    .json(new ApiResponse(200, {}, "User logout"));
});

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Invalid access token");
    }
    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as TokenPayload;

      const user = await User.findById(decodedToken._id);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
      );

      const options = {
        httpOnly: true,
        secure: true,
      };

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {}, "Access Token Refreshed"));
    } catch (error: any) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
    }
  }
);

// const forgotPassword = asyncHandler(async (req, res) => {
//   const { email } = req.body;
//   if (!email) {
//     throw new ApiError(400, "Email is required");
//   }
//   const user = await User.findOne({ email: email });
//   if (!user) {
//     throw new ApiError(400, "email does not exist");
//   }
//   const resetToken = await user.generateResetToken();
//   if (!resetToken) {
//     throw new ApiError(400, "Something went wrong in generating resetToken");
//   }

//   const resetUrl = `http://localhost:5000/api/v1/user/reset-password/${resetToken}`;
//   await sendEmail({
//     to: user.email,
//     subject: "Password Reset",
//     text: `Reset your password using this link:${resetUrl}`,
//   });
//   res
//     .status(200)
//     .json(new ApiResponse(200, resetToken, "Reset link sent to email"));
// });
// const resetPassword = asyncHandler(async (req, res) => {
//   const token = req.params.token;
//   if (!token) {
//     throw new ApiError(400, "Token is required");
//   }

//   const { password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     throw new ApiError(400, "password does not match");
//   }
//   const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

//   const user = await User.findOne({
//     resetPasswordToken: hashedToken,
//     resetPasswordExpire: { $gt: Date.now() },
//   });

//   if (!user) {
//     throw new ApiError(400, "Invalid or expired reset token");
//   }
//   user.password = password;
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpire = undefined;
//   await user.save({ validateBeforeSave: false });
//   res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password has been reset successfully"));
// });

// const changeCurrentPassword = asyncHandler(async (req, res) => {
//   const { oldPassword, newPassword } = req.body;
//   if (!oldPassword || !newPassword) {
//     throw new ApiError(400, "oldPassword and newPassword is required");
//   }
//   const user = await User.findById(req.user._id);
//   const isPasswordCorrect = await user.isPasswordValid(oldPassword);
//   if (!isPasswordCorrect) {
//     throw new ApiError(400, "Invalid old password");
//   }
//   user.password = newPassword;
//   await user.save({ validateBeforeSave: false });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password change successfully"));
// });

const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const [user] = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        email: 1,
        status: 1,
        role: 1,
        avatar: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current user fetch successfully"));
});

const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, title, bio } = req.body;

  const userId = req.user._id;

  const existedUser = await User.findById(userId);

  if (!existedUser) {
    throw new ApiError(404, "User not found");
  }

  const updatedData: Record<string, unknown> = {};

  if (fullName) updatedData.fullName = fullName;
  if (title) updatedData.title = title;
  if (bio) updatedData.bio = bio;

  if (req.file) {
    const avatarLocalPath = req.file.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar path not found");
    }
    const avatar = await uploadAtCloudinary(avatarLocalPath, {
      type: "avatar",
    });
    if (!avatar) {
      throw new ApiError(
        500,
        "Something went wrong while uploading the avatar."
      );
    }
    if (existedUser.avatar) {
      await deleteAtCloudinary(existedUser.avatar.publicId, "image");
    }
    updatedData.avatar = {
      url: avatar.secure_url,
      publicId: avatar.public_id,
    };
  }
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: updatedData,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedUser) {
    throw new ApiError(500, "Something went wrong while updating the user");
  }
  const [user] = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        fullName: 1,
        email: 1,
        role: 1,
        title: 1,
        bio: 1,
        avatar: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile details updated"));
});

// const updateUserAvatar = asyncHandler(async (req, res) => {
//   const avatarLocalPath = req.file?.path;
//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar file is missing");
//   }
//   const avatar = await uploadAtCloudinary(avatarLocalPath);
//   if (!avatar.url) {
//     throw new ApiError(400, "Error during uploading avatar on cloudinary");
//   }

//   const user = await User.findByIdAndUpdate(
//     req.user._id,
//     {
//       $set: {
//         avatar: avatar.url,
//       },
//     },
//     {
//       new: true,
//     }
//   ).select("-password");
//   return res
//     .status(200)
//     .json(new ApiResponse(200, user, "Avatar updated successfully"));
// });

const assignRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const {userId} = req.params;

  if (!role) {
    throw new ApiError(400, "role is required");
  }

  if (!userId) {
    throw new ApiError(400, "user is required");
  }

  const roleExist = await User.findOne({
    _id: userId,
    role,
  });

  if (roleExist) {
    throw new ApiError(400, "User already has this role");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        role,
      },
    },
    {
      new: true,
    }
  );
  if (!user) {
    throw new ApiError(400, "user does not exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully assign new role"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  assignRole,
  getCurrentUser,
  updateUserProfile,
};
