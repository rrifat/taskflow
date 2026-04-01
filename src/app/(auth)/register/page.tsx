import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/_components/auth-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <AuthForm mode="register" />
    </main>
  );
}
