import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { updateTicketForUser } from "@/lib/db/tickets";
import { updateTicketSchema } from "@/lib/validation/tickets-update";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to update a ticket.",
        },
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON payload.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = updateTicketSchema.safeParse(json);

  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields and try again.",
          formErrors,
          fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const ticket = await updateTicketForUser({
    ticketId: id,
    userId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    expiryDate: new Date(parsed.data.expiryDate),
  });

  if (!ticket) {
    return NextResponse.json(
      {
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Unable to update this ticket.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ticket }, { status: 200 });
}
