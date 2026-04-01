import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          user: null,
        },
        { status: 200 },
      );
    }

    const session = await getSessionByToken(sessionToken);

    if (!session) {
      return NextResponse.json(
        {
          user: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        user: session.user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to resolve current user", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while loading the current user.",
        },
      },
      { status: 500 },
    );
  }
}
