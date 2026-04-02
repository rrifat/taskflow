import { Prisma } from "@generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { createCategoryForUser } from "@/lib/db/categories";
import { createCategorySchema } from "@/lib/validation/categories";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to create a category.",
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

  const parsed = createCategorySchema.safeParse(json);

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

  try {
    const category = await createCategoryForUser({
      userId: session.user.id,
      name: parsed.data.name,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "2002"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CATEGORY_NAME_TAKEN",
            message: "You already have a category with this name.",
            fieldErrors: {
              name: ["You already have a category with this name."],
            },
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while creating the category.",
        },
      },
      { status: 500 },
    );
  }
}
