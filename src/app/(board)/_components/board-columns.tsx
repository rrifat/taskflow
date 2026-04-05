"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TicketCreateForm } from "@/app/(board)/_components/ticket-create-form";
import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  moveCategoryInBoard,
  type CategoryDirection,
} from "@/lib/board/category-order";
import {
  getTicketExpiryBadgeClassName,
  getTicketExpiryLabel,
  getTicketExpiryState,
} from "@/lib/board/ticket-expiry";
import { formatUtcDate } from "@/lib/utils/dates";
import {
  getNormalizedDropTarget,
  moveTicketInCategories,
  type DragState,
  type DropTarget,
} from "@/lib/board/ticket-dnd";
import { normalizeFormErrors } from "@/lib/utils/api-errors";
import { type Ticket, type BoardColumnsProps } from "@/lib/board/type";
import TicketEditDrawer from "./ticket-edit-drawer";

export function BoardColumns({
  categories,
  renderedAtMs,
  defaultTicketExpiryDate,
}: BoardColumnsProps) {
  const router = useRouter();
  const [boardCategories, setBoardCategories] = useState(categories);
  const [referenceNowMs, setReferenceNowMs] = useState(renderedAtMs);
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

  useEffect(() => {
    setReferenceNowMs(Date.now());
  }, []);

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

  function handleDragOver(
    event: React.DragEvent<HTMLElement>,
    categoryId: string,
    index: number,
    mode: "calculate" | "fixed",
  ) {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    let targetIndex;

    if (mode === "calculate") {
      const bounds = event.currentTarget.getBoundingClientRect();
      const midpoint = bounds.top + bounds.height / 2;
      targetIndex = event.clientY < midpoint ? index : index + 1;
    } else {
      targetIndex = index;
    }

    const proposedTarget = {
      categoryId,
      index: targetIndex,
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
                      onClick={() => handleCategoryMove(category.id, "left")}
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
                      onClick={() => handleCategoryMove(category.id, "right")}
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
                        handleCategoryDelete(category.id, category.name)
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
                      handleDragOver(event, category.id, 0, "fixed");
                    }}
                    onDrop={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      handleTicketDrop();
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
                          handleDragOver(event, category.id, index, "fixed");
                        }}
                        onDrop={(event) => {
                          if (!dragState) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();
                          handleTicketDrop();
                        }}
                      />
                      <button
                        type="button"
                        draggable
                        data-expiry-state={getTicketExpiryState(
                          ticket.expiryDate,
                          referenceNowMs,
                        )}
                        className={`block w-full rounded-3xl border px-4 py-4 text-left transition hover:cursor-pointer ${
                          dragState?.ticketId === ticket.id
                            ? "border-slate-300 bg-white opacity-60"
                            : getTicketExpiryState(
                                  ticket.expiryDate,
                                  referenceNowMs,
                                ) === "overdue"
                              ? "border-red-200 bg-red-50/40 hover:border-red-300 hover:bg-white"
                              : getTicketExpiryState(
                                    ticket.expiryDate,
                                    referenceNowMs,
                                  ) === "dueSoon"
                                ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-white"
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
                          handleDragOver(
                            event,
                            category.id,
                            index,
                            "calculate",
                          );
                        }}
                        onDrop={(event) => {
                          if (!dragState) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();
                          handleTicketDrop();
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
                          <h3 className="min-w-0 text-sm font-semibold text-slate-950">
                            {ticket.title}
                          </h3>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${getTicketExpiryBadgeClassName(
                                getTicketExpiryState(
                                  ticket.expiryDate,
                                  referenceNowMs,
                                ),
                              )}`}
                            >
                              {getTicketExpiryLabel(
                                ticket.expiryDate,
                                referenceNowMs,
                              )}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatUtcDate(ticket.expiryDate)}
                            </span>
                          </div>
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
                      handleDragOver(
                        event,
                        category.id,
                        category.tickets.length,
                        "fixed",
                      );
                    }}
                    onDrop={(event) => {
                      if (!dragState) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      handleTicketDrop();
                    }}
                  />
                ) : null}
              </div>
              <div className="mt-6">
                <TicketCreateForm
                  categoryId={category.id}
                  categoryName={category.name}
                  defaultExpiryDate={defaultTicketExpiryDate}
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
          referenceNowMs={referenceNowMs}
          descriptionDraft={descriptionDrafts[activeTicket.ticket.id]}
          onDescriptionDraftChange={handleDescriptionDraftChange}
          onDescriptionDraftClear={handleDescriptionDraftClear}
          onClose={() => setActiveTicket(null)}
        />
      ) : null}
    </>
  );
}
