import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

let isConnected = false;

export const connectDb = async () => {
  if (isConnected) return;
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    isConnected = connectionInstance.connection.readyState == 1;
    console.log(
      `\n MongoDB connected ✔ Host: ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("MongoDB FAILED ❌", err);
    process.exit(1);
  }
};

