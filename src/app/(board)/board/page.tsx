import { Metadata } from "next";

import { BoardColumns } from "@/app/(board)/_components/board-columns";
import { CategoryCreateForm } from "@/app/(board)/_components/category-create-form";
import { LogoutButton } from "@/app/(board)/_components/logout-button";
import { requireUser } from "@/lib/auth/guards";
import { listCategoriesByUserId } from "@/lib/db/categories";
import { getCurrentTimeMs, getIsoDateDaysFromNow } from "@/lib/utils/dates";
import { TicketChangedFields } from "@/lib/db/tickets";

export const metadata: Metadata = {
  title: "Board",
};

export default async function BoardPage() {
  const session = await requireUser();
  const categories = await listCategoriesByUserId(session.user.id);
  const renderedAtMs = getCurrentTimeMs();
  const defaultTicketExpiryDate = getIsoDateDaysFromNow(renderedAtMs, 7);
  const categoryCountLabel =
    categories.length === 1
      ? "1 active column"
      : `${categories.length} active columns`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:py-10">
      <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/80 px-6 py-7 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70 backdrop-blur sm:px-8 sm:py-8">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-teal-100/80 via-white/20 to-sky-100/70" />
        <div className="absolute -left-12 top-14 h-28 w-28 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="relative flex justify-end">
          <LogoutButton />
        </div>

        <div className="relative mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_24rem] xl:items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-700">
              Workspace board
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {session.user.name}&apos;s Board
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
              Shape your work across movable columns and keep ticket changes
              easy to scan. The board stays flexible while the layout keeps your
              key actions close at hand.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800">
                {categoryCountLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-600">
                Drag, edit, and organize tickets with a calmer flow
              </span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)] sm:p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Quick actions
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
              Manage your board
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add the next stage in your workflow and keep the board structure
              feeling deliberate.
            </p>

            <div className="mt-5 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
              <p className="text-sm font-semibold text-slate-900">
                Add a new column
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Create the next stage in your workflow, from backlog to review.
              </p>

              <div className="mt-4">
                <CategoryCreateForm />
              </div>
            </div>
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
                  changedFields: entry.changedFields as TicketChangedFields,
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
