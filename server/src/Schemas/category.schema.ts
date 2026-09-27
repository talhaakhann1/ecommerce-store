import { z } from "zod";

export const addCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters long")
    .max(250, "Description cannot exceed 250 characters"),
});

export type AddCategoryInput = z.infer<typeof addCategorySchema>;
