import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { deleteCategoryForUser } from "@/lib/db/categories";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to delete a category.",
        },
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const deleted = await deleteCategoryForUser({
    categoryId: id,
    userId: session.user.id,
  });

  if (!deleted) {
    return NextResponse.json(
      {
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Unable to delete this category.",
        },
      },
      { status: 404 },
    );
  }

  if (deleted.blocked) {
    return NextResponse.json(
      {
        error: {
          code: "CATEGORY_NOT_EMPTY",
          message:
            "Only empty categories can be deleted. Move or delete the tickets in this column first.",
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
