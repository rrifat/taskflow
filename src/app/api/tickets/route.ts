import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { createTicketForUser } from "@/lib/db/tickets";
import { createTicketSchema } from "@/lib/validation/tickets";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to create a ticket.",
        },
      },
      { status: 401 },
    );
  }

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

  const parsed = createTicketSchema.safeParse(json);

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

  const ticket = await createTicketForUser({
    userId: session.user.id,
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    description: parsed.data.description,
    expiryDate: new Date(parsed.data.expiryDate),
  });

  if (!ticket) {
    return NextResponse.json(
      {
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Unable to create a ticket in this category.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
