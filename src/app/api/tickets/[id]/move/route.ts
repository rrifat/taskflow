import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { moveTicketForUser } from "@/lib/db/tickets";
import { moveTicketSchema } from "@/lib/validation/tickets-move";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to move a ticket.",
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

  const parsed = moveTicketSchema.safeParse(json);

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

  const moved = await moveTicketForUser({
    ticketId: id,
    userId: session.user.id,
    destinationCategoryId: parsed.data.destinationCategoryId,
    destinationIndex: parsed.data.destinationIndex,
  });

  if (!moved) {
    return NextResponse.json(
      {
        error: {
          code: "MOVE_TARGET_NOT_FOUND",
          message: "Unable to move this ticket to the requested category.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
