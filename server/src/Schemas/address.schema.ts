import { z } from "zod";

export const addAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters long")
    .max(100, "Full name cannot exceed 100 characters"),

  addressLine: z
    .string()
    .trim()
    .min(5, "Address line must be at least 5 characters long")
    .max(250, "Address line cannot exceed 250 characters"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters long")
    .max(15, "Phone number cannot exceed 15 characters")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City name is too long"),

  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .max(100, "Country name is too long"),

  postalCode: z
    .string()
    .trim()
    .min(4, "Postal code must be at least 4 characters long")
    .max(10, "Postal code cannot exceed 10 characters"),
});

export const updateAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters long")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),

  addressLine: z
    .string()
    .trim()
    .min(5, "Address line must be at least 5 characters long")
    .max(250, "Address line cannot exceed 250 characters"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters long")
    .max(15, "Phone number cannot exceed 15 characters")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
    .optional(),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City name is too long")
    .optional(),

  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .max(100, "Country name is too long")
    .optional(),

  postalCode: z
    .string()
    .trim()
    .min(4, "Postal code must be at least 4 characters long")
    .max(10, "Postal code cannot exceed 10 characters")
    .optional(),
});

export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type updateAddressInput = z.infer<typeof updateAddressSchema>;
