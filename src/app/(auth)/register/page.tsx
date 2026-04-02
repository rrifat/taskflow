import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { requireGuest } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage() {
  await requireGuest();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <AuthForm mode="register" />
    </main>
  );
}
