import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import type { NextFunction, Request } from "express";
import type { IUser } from "../interfaces/user.interface.js";
import type { TokenPayload } from "../types/global.js";

export const verifyJWT = asyncHandler(
  async (req: Request, _, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as TokenPayload;

      if (!decodedToken) {
        throw new ApiError(400, "Invalid access token");
      }
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }

      req.user = user as IUser;
      next();
    } catch (error: unknown) {
      throw new ApiError(
        401,
        error instanceof Error ? error.message : "Invalid access token"
      );
    }
  }
);

export const verifyRoles = (roles: string[] = []) =>
  asyncHandler(async (req: Request, _, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }
    if (roles.includes(req.user.role)) {
      next();
    } else {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
  });
