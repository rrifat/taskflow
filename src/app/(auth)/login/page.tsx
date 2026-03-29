import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Authentication
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Login route placeholder
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          This page will become the database-backed session login flow in the
          next implementation slice.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
