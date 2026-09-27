import mongoose, { Model, Schema } from "mongoose";
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken'
import crypto from "crypto";
import type { IUser } from "../interfaces/user.interface.js";
import { UserRoles } from "../types/enums/user.enum.js";

const userSchema = new Schema<IUser>({
    username: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        index: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: UserRoles,
        default: UserRoles.CUSTOMER
    },
    avatar: {
        url: {
          type: String,
          default: `https://via.placeholder.com/200x200.png`,
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    password: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    resetPasswordToken: {
        type:String
    },
    resetPasswordExpire: {
        type:Date
    },
    isActive: {
        type: Boolean,
        required: true
    }
}, { timestamps: true })

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next;
    this.password = await bcrypt.hash(this.password, 10)
    next
})


userSchema.methods.isPasswordValid = async function (password:string) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken=function(){
   const expiresIn = ( process.env.ACCESS_TOKEN_EXPIRY || "1d") as NonNullable<SignOptions["expiresIn"]>;
    return jwt.sign(
       {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET as string ,
    {
      expiresIn
    }
    )
}

userSchema.methods.generateRefreshToken=function(){
   const expiresIn = (process.env.REFRESH_TOKEN_EXPIRY || "1d") as NonNullable<SignOptions["expiresIn"]>;
  return jwt.sign(
       {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.REFRESH_TOKEN_SECRET as string ,
    {
      expiresIn
    }
    )
}

userSchema.methods.generateResetToken =async function () {
    const resetToken= crypto.randomBytes(32).toString("hex");
    console.log(resetToken)
    this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); 
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; 
     await this.save({ validateBeforeSave: false });
    return resetToken
}
export const User:Model<IUser> = mongoose.model<IUser>("User", userSchema)