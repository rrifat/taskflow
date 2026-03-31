import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db/client";

const SESSION_COOKIE_NAME = "taskflow_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is required for session signing.");
  }

  return secret;
}

function signSessionId(sessionId: string) {
  return createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("hex");
}

export function encodeSessionToken(sessionId: string) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

export function isSessionTokenValid(token: string) {
  const [sessionId, signature] = token.split(".");

  if (!sessionId || !signature) {
    return false;
  }

  const expectedSignature = signSessionId(sessionId);

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function createSession(userId: string) {
  return prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    },
  });
}

export function getSessionCookie(sessionId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: encodeSessionToken(sessionId),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
