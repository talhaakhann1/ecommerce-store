import { z } from "zod";

export const createReviewSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(6, "Comment must be at least 6 characters long"),
    
  rating: z.number().int().min(1).max(5),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
