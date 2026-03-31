import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createSession, getSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { registerSchema } from "@/lib/validation/auth";
import { z } from "zod";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON payload." } },
      { status: 400 },
    );
  }

  try {
    const parsedBody = registerSchema.safeParse(json);

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

    const { name, email, password } = parsedBody.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_TAKEN",
            message: "An account with that email already exists.",
            fieldErrors: {
              email: ["An account with that email already exists."],
            },
          },
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });

    response.cookies.set(getSessionCookie(session.id));

    return response;
  } catch (error) {
    console.error("Registration failed", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while creating the account.",
        },
      },
      { status: 500 },
    );
  }
}
