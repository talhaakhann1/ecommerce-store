import { z } from "zod";

export const addProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(2000, "Description cannot exceed 2000 characters"),

  brand: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters long")
    .max(50, "Brand name cannot exceed 50 characters"),

  originalPrice: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),

  category: z.string().trim().min(1, "Category is required").optional(),

  isPublished: z.coerce.boolean().default(false),
});


export const updateProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title cannot exceed 100 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  brand: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters long")
    .max(50, "Brand name cannot exceed 50 characters")
    .optional(),

  originalPrice: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .optional(),

  stock: z.coerce
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .optional(),

  category: z.string().trim().min(1, "Category is required").optional(),

  isPublished: z.coerce.boolean().default(false).optional(),
});

export type CreateProductInput = z.infer<typeof addProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
