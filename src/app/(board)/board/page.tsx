import Link from "next/link";
import { Metadata } from "next";

import { CategoryCreateForm } from "@/app/(board)/_components/category-create-form";
import { requireUser } from "@/lib/auth/guards";
import { listCategoriesByUserId } from "@/lib/db/categories";

export const metadata: Metadata = {
  title: "Board",
};

export default async function BoardPage() {
  const session = await requireUser();
  const categories = await listCategoriesByUserId(session.user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-12">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:min-w-0 lg:flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Workspace board
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Welcome back, {session.user.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Start shaping your board by creating categories. Tickets and richer
            board interactions will build on this structure next.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-4 lg:w-[24rem] lg:shrink-0">
          <CategoryCreateForm />
          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to overview
          </Link>
        </div>
      </section>

      {categories.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-8 py-14 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            No categories yet
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Create your first column to start structuring the board
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Categories become the foundation of your workflow. Add one above to
            define the first stage, such as Backlog, In Progress, or Review.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Board lanes
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Categories flow left to right so the board keeps a stable kanban
                rhythm as it grows.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              {categories.length} {categories.length === 1 ? "column" : "columns"}
            </p>
          </div>

          <div className="-mx-6 overflow-x-auto px-6 pb-4">
            <div className="flex min-w-full gap-5">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="min-h-[20rem] w-[20rem] shrink-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Column {category.order + 1}
                      </p>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                        {category.name}
                      </h2>
                    </div>
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {category._count.tickets}
                    </span>
                  </div>
                  <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      Tickets will appear here next
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
