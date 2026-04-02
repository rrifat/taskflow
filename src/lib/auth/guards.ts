import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireGuest() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/board");
  }
}
