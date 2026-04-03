import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { moveCategoryForUser } from "@/lib/db/categories";
import { moveCategorySchema } from "@/lib/validation/categories-move";

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
          message: "You must be signed in to reorder categories.",
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

  const parsed = moveCategorySchema.safeParse(json);

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

  const moved = await moveCategoryForUser({
    categoryId: id,
    userId: session.user.id,
    direction: parsed.data.direction,
  });

  if (!moved) {
    return NextResponse.json(
      {
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Unable to find that category.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
