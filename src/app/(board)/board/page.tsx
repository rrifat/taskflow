import { Metadata } from "next";

import { BoardColumns } from "@/app/(board)/_components/board-columns";
import { CategoryCreateForm } from "@/app/(board)/_components/category-create-form";
import { LogoutButton } from "@/app/(board)/_components/logout-button";
import { requireUser } from "@/lib/auth/guards";
import { listCategoriesByUserId } from "@/lib/db/categories";
import { getCurrentTimeMs, getIsoDateDaysFromNow } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Board",
};

export default async function BoardPage() {
  const session = await requireUser();
  const categories = await listCategoriesByUserId(session.user.id);
  const renderedAtMs = getCurrentTimeMs();
  const defaultTicketExpiryDate = getIsoDateDaysFromNow(renderedAtMs, 7);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:min-w-0 lg:flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Workspace board
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {session.user.name}&apos;s Board
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Shape your work across movable columns and keep ticket changes easy
            to scan.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 lg:w-[24rem] lg:shrink-0 lg:items-end">
          <LogoutButton />
          <div className="w-full">
            <CategoryCreateForm />
          </div>
        </div>
      </section>

      {categories.length === 0 ? (
        <section className="rounded-4xl border border-dashed border-slate-300 bg-white/70 px-8 py-14 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
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
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
                Board lanes
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Categories flow left to right so the board keeps a stable kanban
                rhythm as it grows.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              {categories.length}{" "}
              {categories.length === 1 ? "column" : "columns"}
            </p>
          </div>

          <BoardColumns
            categories={categories.map((category) => ({
              ...category,
              tickets: category.tickets.map((ticket) => ({
                ...ticket,
                expiryDate: ticket.expiryDate.toISOString(),
                history: ticket.history.map((entry) => ({
                  ...entry,
                  createdAt: entry.createdAt.toISOString(),
                })),
              })),
            }))}
            renderedAtMs={renderedAtMs}
            defaultTicketExpiryDate={defaultTicketExpiryDate}
          />
        </section>
      )}
    </main>
  );
}
