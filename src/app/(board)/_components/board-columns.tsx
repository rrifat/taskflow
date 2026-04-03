"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";

import {
  TicketFormFields,
  type TicketFormValues,
} from "@/app/(board)/_components/ticket-form-fields";
import { TicketCreateForm } from "@/app/(board)/_components/ticket-create-form";
import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  moveCategoryInBoard,
  type CategoryDirection,
} from "@/lib/board/category-order";
import {
  getNormalizedDropTarget,
  moveTicketInCategories,
  type DragState,
  type DropTarget,
} from "@/lib/board/ticket-dnd";
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { updateTicketSchema } from "@/lib/validation/tickets-update";

type Ticket = {
  id: string;
  title: string;
  description: string;
  expiryDate: string;
  order: number;
  history: {
    id: string;
    type: "CREATED" | "UPDATED" | "MOVED" | "DELETED";
    fromCategoryId: string | null;
    toCategoryId: string | null;
    changedFields: Record<
      string,
      {
        from: string;
        to: string;
      }
    > | null;
    createdAt: string;
  }[];
};

type Category = {
  id: string;
  name: string;
  order: number;
  tickets: Ticket[];
  _count: {
    tickets: number;
  };
};

type BoardColumnsProps = {
  categories: Category[];
};

function formatExpiryDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

function formatHistoryTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getHistoryLabel(
  entry: Ticket["history"][number],
  categoryNames: Record<string, string>,
) {
  if (entry.type === "CREATED") {
    const categoryName = entry.toCategoryId
      ? categoryNames[entry.toCategoryId]
      : undefined;

    return categoryName ? `Created in ${categoryName}` : "Created";
  }

  if (entry.type === "MOVED") {
    const fromCategoryName = entry.fromCategoryId
      ? categoryNames[entry.fromCategoryId]
      : undefined;
    const toCategoryName = entry.toCategoryId
      ? categoryNames[entry.toCategoryId]
      : undefined;

    if (
      fromCategoryName &&
      toCategoryName &&
      fromCategoryName !== toCategoryName
    ) {
      return `Moved from ${fromCategoryName} to ${toCategoryName}`;
    }
    const nextOrder = entry.changedFields?.order?.to;

    if (typeof nextOrder === "string") {
      return `Reordered in ${toCategoryName ?? "this column"} to position ${Number(nextOrder) + 1}`;
    }

    return "Moved";
  }

  if (entry.type === "UPDATED") {
    const changedFieldLabels = Object.keys(entry.changedFields ?? {}).map(
      (field) => {
        if (field === "expiryDate") {
          return "expiry date";
        }

        return field;
      },
    );

    if (changedFieldLabels.length === 0) {
      return "Updated ticket details";
    }

    return `Updated ${changedFieldLabels.join(", ")}`;
  }

  return "Deleted";
}

function getHistoryTypeBadgeClassName(
  entryType: Ticket["history"][number]["type"],
) {
  return {
    CREATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    UPDATED: "border-sky-200 bg-sky-50 text-sky-700",
    MOVED: "border-amber-200 bg-amber-50 text-amber-700",
    DELETED: "border-slate-200 bg-slate-100 text-slate-700",
  }[entryType];
}

function TicketEditDrawer({
  categoryName,
  ticket,
  categoryNames,
  descriptionDraft,
  onDescriptionDraftChange,
  onDescriptionDraftClear,
  onClose,
}: {
  categoryName: string;
  ticket: Ticket;
  categoryNames: Record<string, string>;
  descriptionDraft?: string;
  onDescriptionDraftChange: (ticketId: string, value: string) => void;
  onDescriptionDraftClear: (ticketId: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [ticketFields, setTicketFields] = useReducer(
    (state: TicketFormValues, next: Partial<TicketFormValues>) => ({
      ...state,
      ...next,
    }),
    {
      title: ticket.title,
      description: descriptionDraft ?? ticket.description,
      expiryDate: toDateInputValue(ticket.expiryDate),
    },
  );

  const { title, description, expiryDate } = ticketFields;
  const hasDraftDescription =
    typeof descriptionDraft === "string" &&
    descriptionDraft !== ticket.description;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const normalizedExpiryDate = expiryDate
      ? new Date(`${expiryDate}T00:00:00.000Z`).toISOString()
      : "";

    const parsed = updateTicketSchema.safeParse({
      title,
      description,
      expiryDate: normalizedExpiryDate,
    });

    if (!parsed.success) {
      const { formErrors, fieldErrors } = z.flattenError(parsed.error);
      setErrors({ formErrors, fieldErrors });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setErrors(normalizeFormErrors(payload));
        return;
      }

      onDescriptionDraftClear(ticket.id);
      router.refresh();
      onClose();
    } catch {
      setErrors({
        formErrors: [
          "Unable to update this ticket right now. Please try again.",
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (
      isSubmitting ||
      !window.confirm("Delete this ticket? This action cannot be undone.")
    ) {
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setErrors(normalizeFormErrors(payload));
        return;
      }

      onDescriptionDraftClear(ticket.id);
      router.refresh();
      onClose();
    } catch {
      setErrors({
        formErrors: [
          "Unable to delete this ticket right now. Please try again.",
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px]"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Edit ticket
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
              {categoryName}
            </h3>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800 hover:cursor-pointer"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <p className="text-sm leading-7 text-slate-600">
            Update the ticket details here. Changes apply only when you save.
          </p>

          <FormErrorBanner message={errors.formErrors?.[0]} />

          {hasDraftDescription ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Unsaved description draft restored. This local draft clears on
              refresh.
            </div>
          ) : null}

          <TicketFormFields
            values={{ title, description, expiryDate }}
            errors={errors.fieldErrors}
            onChange={(next) => {
              setTicketFields(next);

              if (typeof next.description === "string") {
                onDescriptionDraftChange(ticket.id, next.description);
              }
            }}
          />

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              className="hover:cursor-pointer sm:flex-1"
              onClick={() => void handleDelete()}
            >
              {isSubmitting ? "Working..." : "Delete Ticket"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="sm:flex-1 hover:cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <section className="space-y-3 border-t border-slate-200 pt-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-950">History</h4>
              <p className="mt-1 text-sm text-slate-600">
                Recent changes for this ticket.
              </p>
            </div>

            {ticket.history.length > 0 ? (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {ticket.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {getHistoryLabel(entry, categoryNames)}
                        </p>

                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                          {formatHistoryTimestamp(entry.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${getHistoryTypeBadgeClassName(entry.type)}`}
                      >
                        {entry.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No history has been recorded for this ticket yet.
              </p>
            )}
          </section>
        </form>
      </aside>
    </>,
    document.body,
  );
}

export function BoardColumns({ categories }: BoardColumnsProps) {
  const router = useRouter();
  const [boardCategories, setBoardCategories] = useState(categories);
  const [activeTicket, setActiveTicket] = useState<{
    categoryName: string;
    ticket: Ticket;
  } | null>(null);
  const [descriptionDrafts, setDescriptionDrafts] = useState<
    Record<string, string>
  >({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const categoryNames = Object.fromEntries(
    boardCategories.map((category) => [category.id, category.name]),
  );

  useEffect(() => {
    setBoardCategories(categories);
  }, [categories]);

  function handleDescriptionDraftChange(ticketId: string, value: string) {
    setDescriptionDrafts((current) => ({
      ...current,
      [ticketId]: value,
    }));
  }

  function handleDescriptionDraftClear(ticketId: string) {
    setDescriptionDrafts((current) => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });
  }

  function handleCardDragOver(
    event: React.DragEvent<HTMLElement>,
    categoryId: string,
    index: number,
  ) {
    if (!dragState) {
      return;
    }

    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const midpoint = bounds.top + bounds.height / 2;
    const proposedTarget = {
      categoryId,
      index: event.clientY < midpoint ? index : index + 1,
    };
    const normalizedTarget = getNormalizedDropTarget(
      boardCategories,
      dragState,
      proposedTarget,
    );

    if (!normalizedTarget) {
      if (dropTarget) {
        setDropTarget(null);
      }
      return;
    }

    if (
      !dropTarget ||
      dropTarget.categoryId !== normalizedTarget.categoryId ||
      dropTarget.index !== normalizedTarget.index
    ) {
      setDropTarget(normalizedTarget);
    }
  }

  async function handleTicketDrop() {
    if (!dragState || !dropTarget) {
      return;
    }

    const nextCategories = moveTicketInCategories(
      boardCategories,
      dragState.ticketId,
      dragState.sourceCategoryId,
      dropTarget.categoryId,
      dropTarget.index,
    );

    setBoardCategories(nextCategories);
    setMoveError(null);
    setDragState(null);
    setDropTarget(null);

    try {
      const response = await fetch(`/api/tickets/${dragState.ticketId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationCategoryId: dropTarget.categoryId,
          destinationIndex: dropTarget.index,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setMoveError(
          normalizeFormErrors(payload).formErrors?.[0] ??
            "Unable to move this ticket right now. Please try again.",
        );
        setBoardCategories(categories);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setMoveError("Unable to move this ticket right now. Please try again.");
      setBoardCategories(categories);
      router.refresh();
    }
  }

  async function handleCategoryMove(
    categoryId: string,
    direction: CategoryDirection,
  ) {
    const nextCategories = moveCategoryInBoard(
      boardCategories,
      categoryId,
      direction,
    );

    if (nextCategories === boardCategories) {
      return;
    }

    setBoardCategories(nextCategories);
    setMoveError(null);
    setMovingCategoryId(categoryId);

    try {
      const response = await fetch(`/api/categories/${categoryId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setMoveError(
          normalizeFormErrors(payload).formErrors?.[0] ??
            "Unable to reorder this category right now. Please try again.",
        );
        setBoardCategories(categories);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setMoveError(
        "Unable to reorder this category right now. Please try again.",
      );
      setBoardCategories(categories);
      router.refresh();
    } finally {
      setMovingCategoryId(null);
    }
  }

  async function handleCategoryDelete(
    categoryId: string,
    categoryName: string,
  ) {
    if (
      deletingCategoryId ||
      !window.confirm(
        `Delete the "${categoryName}" category? Only empty categories can be deleted.`,
      )
    ) {
      return;
    }

    const nextCategories = boardCategories
      .filter((category) => category.id !== categoryId)
      .map((category, index) => ({
        ...category,
        order: index,
      }));

    setBoardCategories(nextCategories);
    setMoveError(null);
    setDeletingCategoryId(categoryId);

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setMoveError(
          normalizeFormErrors(payload).formErrors?.[0] ??
            "Unable to delete this category right now. Please try again.",
        );
        setBoardCategories(categories);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setMoveError(
        "Unable to delete this category right now. Please try again.",
      );
      setBoardCategories(categories);
      router.refresh();
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <>
      <FormErrorBanner message={moveError ?? undefined} />
      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-full gap-5">
          {boardCategories.map((category, categoryIndex) => (
            <SurfaceCard
              key={category.id}
              className="flex min-h-80 w-100 shrink-0 flex-col p-6"
              onDragOver={(event) => {
                if (!dragState) {
                  return;
                }

                event.preventDefault();

                if (event.target !== event.currentTarget) {
                  return;
                }

                const normalizedTarget = getNormalizedDropTarget(
                  boardCategories,
                  dragState,
                  {
                    categoryId: category.id,
                    index: category.tickets.length,
                  },
                );

                if (!normalizedTarget) {
                  if (dropTarget) {
                    setDropTarget(null);
                  }
                  return;
                }

                if (
                  !dropTarget ||
                  dropTarget.categoryId !== normalizedTarget.categoryId ||
                  dropTarget.index !== normalizedTarget.index
                ) {
                  setDropTarget(normalizedTarget);
                }
              }}
              onDrop={(event) => {
                if (!dragState) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                void handleTicketDrop();
              }}
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
                <div className="flex items-center gap-2">
                  <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {category._count.tickets}
                  </span>
                  <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-8 min-w-8 border-0 px-0 shadow-none hover:cursor-pointer"
                      disabled={
                        categoryIndex === 0 || movingCategoryId === category.id
                      }
                      aria-label={`Move ${category.name} left`}
                      onClick={() =>
                        void handleCategoryMove(category.id, "left")
                      }
                    >
                      ←
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-8 min-w-8 border-0 px-0 shadow-none hover:cursor-pointer"
                      disabled={
                        categoryIndex === boardCategories.length - 1 ||
                        movingCategoryId === category.id
                      }
                      aria-label={`Move ${category.name} right`}
                      onClick={() =>
                        void handleCategoryMove(category.id, "right")
                      }
                    >
                      →
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="min-h-8 min-w-8 px-0 hover:cursor-pointer"
                      disabled={
                        category._count.tickets > 0 ||
                        deletingCategoryId === category.id ||
                        movingCategoryId === category.id
                      }
                      aria-label={`Delete ${category.name}`}
                      onClick={() =>
                        void handleCategoryDelete(category.id, category.name)
                      }
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex-1 space-y-3">
                {category.tickets.length === 0 ? (
                  <div
                    className={`rounded-3xl border border-dashed px-4 py-8 text-center transition ${
                      dragState && dropTarget?.categoryId === category.id
                        ? "border-slate-400 bg-white"
                        : "border-slate-200 bg-slate-50"
                    }`}
                    onDragOver={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();

                      const normalizedTarget = getNormalizedDropTarget(
                        boardCategories,
                        dragState,
                        {
                          categoryId: category.id,
                          index: 0,
                        },
                      );

                      if (!normalizedTarget) {
                        if (dropTarget) {
                          setDropTarget(null);
                        }
                        return;
                      }

                      if (
                        !dropTarget ||
                        dropTarget.categoryId !== normalizedTarget.categoryId ||
                        dropTarget.index !== normalizedTarget.index
                      ) {
                        setDropTarget(normalizedTarget);
                      }
                    }}
                    onDrop={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      void handleTicketDrop();
                    }}
                  >
                    <p className="text-sm font-medium text-slate-600">
                      Tickets will appear here next
                    </p>
                  </div>
                ) : (
                  category.tickets.map((ticket, index) => (
                    <div key={ticket.id} className="space-y-3">
                      <div
                        className={`h-2 rounded-full transition ${
                          dragState &&
                          dropTarget?.categoryId === category.id &&
                          dropTarget.index === index
                            ? "bg-slate-300"
                            : "bg-transparent"
                        }`}
                        onDragOver={(event) => {
                          if (!dragState) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();

                          const normalizedTarget = getNormalizedDropTarget(
                            boardCategories,
                            dragState,
                            {
                              categoryId: category.id,
                              index,
                            },
                          );

                          if (!normalizedTarget) {
                            if (dropTarget) {
                              setDropTarget(null);
                            }
                            return;
                          }

                          if (
                            !dropTarget ||
                            dropTarget.categoryId !==
                              normalizedTarget.categoryId ||
                            dropTarget.index !== normalizedTarget.index
                          ) {
                            setDropTarget(normalizedTarget);
                          }
                        }}
                        onDrop={(event) => {
                          if (!dragState) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();
                          void handleTicketDrop();
                        }}
                      />
                      <button
                        type="button"
                        draggable
                        className={`block w-full rounded-3xl border px-4 py-4 text-left transition hover:cursor-pointer ${
                          dragState?.ticketId === ticket.id
                            ? "border-slate-300 bg-white opacity-60"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        }`}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", ticket.id);
                          setDragState({
                            ticketId: ticket.id,
                            sourceCategoryId: category.id,
                            sourceIndex: index,
                          });
                          setDropTarget(null);
                          setMoveError(null);
                        }}
                        onDragEnd={() => {
                          setDragState(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(event) => {
                          event.stopPropagation();
                          handleCardDragOver(event, category.id, index);
                        }}
                        onDrop={(event) => {
                          if (!dragState) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();
                          void handleTicketDrop();
                        }}
                        onClick={() => {
                          if (dragState) {
                            return;
                          }

                          setActiveTicket({
                            categoryName: category.name,
                            ticket,
                          });
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="min-w-0 text-sm font-semibold text-slate-950">
                              {ticket.title}
                            </h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {formatExpiryDate(ticket.expiryDate)}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                          {ticket.description}
                        </p>
                      </button>
                    </div>
                  ))
                )}
                {category.tickets.length > 0 ? (
                  <div
                    className={`h-2 rounded-full transition ${
                      dragState &&
                      dropTarget?.categoryId === category.id &&
                      dropTarget.index === category.tickets.length
                        ? "bg-slate-300"
                        : "bg-transparent"
                    }`}
                    onDragOver={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();

                      const normalizedTarget = getNormalizedDropTarget(
                        boardCategories,
                        dragState,
                        {
                          categoryId: category.id,
                          index: category.tickets.length,
                        },
                      );

                      if (!normalizedTarget) {
                        if (dropTarget) {
                          setDropTarget(null);
                        }
                        return;
                      }

                      if (
                        !dropTarget ||
                        dropTarget.categoryId !== normalizedTarget.categoryId ||
                        dropTarget.index !== normalizedTarget.index
                      ) {
                        setDropTarget(normalizedTarget);
                      }
                    }}
                    onDrop={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      void handleTicketDrop();
                    }}
                  />
                ) : null}
              </div>
              <div className="mt-6">
                <TicketCreateForm
                  categoryId={category.id}
                  categoryName={category.name}
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>

      {activeTicket ? (
        <TicketEditDrawer
          categoryName={activeTicket.categoryName}
          ticket={activeTicket.ticket}
          categoryNames={categoryNames}
          descriptionDraft={descriptionDrafts[activeTicket.ticket.id]}
          onDescriptionDraftChange={handleDescriptionDraftChange}
          onDescriptionDraftClear={handleDescriptionDraftClear}
          onClose={() => setActiveTicket(null)}
        />
      ) : null}
    </>
  );
}
