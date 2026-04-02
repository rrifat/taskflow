import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(40, "Category name must be 40 characters or fewer."),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
