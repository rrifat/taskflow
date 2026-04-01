import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, getSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/client";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
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

  try {
    const parsedBody = loginSchema.safeParse(json);

    if (!parsedBody.success) {
      const { fieldErrors, formErrors } = z.flattenError(parsedBody.error);

      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields and try again.",
            fieldErrors,
            formErrors,
          },
        },
        { status: 422 },
      );
    }

    const { email, password } = parsedBody.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect.",
            formErrors: ["Email or password is incorrect."],
          },
        },
        { status: 401 },
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 },
    );

    response.cookies.set(getSessionCookie(session.id));

    return response;
  } catch (error) {
    console.error("Login failed", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while signing in.",
        },
      },
      { status: 500 },
    );
  }
}
