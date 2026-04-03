import { z } from "zod";

export const moveCategorySchema = z.object({
  direction: z.enum(["left", "right"]),
});
