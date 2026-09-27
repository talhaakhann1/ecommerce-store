import mongoose, { Model, Schema } from "mongoose";
import type { IReview } from "../interfaces/review.interface.js";

const reviewSchema = new Schema<IReview>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    rating:{
        type:Number,
        required:true
    },
    comment:{
        type:String,
        required:true
    }
}, { timestamps: true })

export const Review:Model<IReview> = mongoose.model<IReview>("Review", reviewSchema)