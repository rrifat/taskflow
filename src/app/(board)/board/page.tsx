import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Board",
};

export default async function BoardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-16">
      <section className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Board shell
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Protected board placeholder
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            This route will become the authenticated server-rendered entry point
            for the board.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Signed in as {session.user.name}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          Back to overview
        </Link>
      </section>
    </main>
  );
}
