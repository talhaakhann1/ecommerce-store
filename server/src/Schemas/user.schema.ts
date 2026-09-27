import { z } from "zod";

export const signUpSchema=z.object({
    username: z
    .string()
    .trim()
    .min(4, "Username must be at least 4 characters long"),
    email:z.string().min(4,"username must be atleast 4 letters")
    .email({ message: "Invalid email address" })
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Please provide a valid email address",
    ),
    password:z.string().min(6,"Password must be atleast 6 letters"),
})

export const signInSchema=z.object({
    email:z.string(),
    password:z.string(),
})

