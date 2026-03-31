import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(72, "Password must be 72 characters or fewer."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
