import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import {
  decodeSessionToken,
  getClearedSessionCookie,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    );

    if (!sessionToken) {
      response.cookies.set(getClearedSessionCookie());
      return response;
    }

    const sessionId = decodeSessionToken(sessionToken);

    if (sessionId) {
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
        },
      });
    }

    response.cookies.set(getClearedSessionCookie());

    return response;
  } catch (error) {
    console.error("Logout failed", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while signing out.",
        },
      },
      { status: 500 },
    );
  }
}
