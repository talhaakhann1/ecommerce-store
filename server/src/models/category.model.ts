import mongoose,{Model, Schema} from "mongoose";
import slugify from "slugify";
import type { ICateory } from "../interfaces/category.interface.js";
import type { NextFunction } from "express";

const categorySchema = new Schema<ICateory>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image:{
        url:{
           type: String,
          default: `https://via.placeholder.com/200x200.png`
        },
        publicId:{
            type:String
        }
    },
    slug: {
        type: String,
        unique: true,
    }
}, { timestamps: true })

categorySchema.pre("save", function (next) {
  if (!this.isModified("name")) return next;

  this.slug = slugify(this.name.toLowerCase());

  next;
});

export const Category:Model<ICateory> = mongoose.model<ICateory>("Category", categorySchema)