import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/board");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <AuthForm mode="login" />
    </main>
  );
}
