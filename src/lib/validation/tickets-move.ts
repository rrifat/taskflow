import { z } from "zod";

export const moveTicketSchema = z.object({
  destinationCategoryId: z.uuid("A valid destination category is required."),
  destinationIndex: z
    .number()
    .int("Destination index must be an integer.")
    .min(0, "Destination index must be zero or greater."),
});

export type MoveTicketInput = z.infer<typeof moveTicketSchema>;
