import { z } from "zod";

export const updateTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Ticket title is required.")
    .max(120, "Ticket title must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(1, "Ticket description is required.")
    .max(2000, "Ticket description must be 2000 characters or fewer."),
  expiryDate: z.iso.datetime({
    message: "Expiry date is required.",
  }),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
