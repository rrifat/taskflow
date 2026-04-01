import Link from "next/link";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/config/app";

const links = [
  {
    href: "/login",
    label: "Login route",
    description:
      "Sign in with the database-backed session flow.",
  },
  {
    href: "/register",
    label: "Register route",
    description:
      "Create a new account through the shared validation and auth API flow.",
  },
  {
    href: "/board",
    label: "Board route",
    description:
      "Protected board area placeholder that will become the main kanban surface.",
  },
  {
    href: "/api/health",
    label: "Health endpoint",
    description:
      "Lightweight API route to verify the app shell is wired up correctly.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {APP_NAME}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              {APP_DESCRIPTION}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <p className="text-lg font-semibold text-slate-950">{link.label}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {link.description}
            </p>
            <span className="mt-6 inline-flex text-sm font-medium text-slate-900">
              Open route
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
