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
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { updateTicketSchema } from "@/lib/validation/tickets-update";

type Ticket = {
  id: string;
  title: string;
  description: string;
  expiryDate: string;
  order: number;
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

function TicketEditDrawer({
  categoryName,
  ticket,
  descriptionDraft,
  onDescriptionDraftChange,
  onDescriptionDraftClear,
  onClose,
}: {
  categoryName: string;
  ticket: Ticket;
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
    typeof descriptionDraft === "string" && descriptionDraft !== ticket.description;

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
              type="submit"
              disabled={isSubmitting}
              className="sm:flex-1 hover:cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </aside>
    </>,
    document.body,
  );
}

export function BoardColumns({ categories }: BoardColumnsProps) {
  const [activeTicket, setActiveTicket] = useState<{
    categoryName: string;
    ticket: Ticket;
  } | null>(null);
  const [descriptionDrafts, setDescriptionDrafts] = useState<
    Record<string, string>
  >({});

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

  return (
    <>
      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-full gap-5">
          {categories.map((category) => (
            <SurfaceCard
              key={category.id}
              className="flex min-h-80 w-[20rem] shrink-0 flex-col p-6"
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
              <div className="mt-6 flex-1 space-y-3">
                {category.tickets.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      Tickets will appear here next
                    </p>
                  </div>
                ) : (
                  category.tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className="block w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white hover:cursor-pointer"
                      onClick={() =>
                        setActiveTicket({
                          categoryName: category.name,
                          ticket,
                        })
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {ticket.title}
                        </h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {formatExpiryDate(ticket.expiryDate)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {ticket.description}
                      </p>
                    </button>
                  ))
                )}
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
          descriptionDraft={descriptionDrafts[activeTicket.ticket.id]}
          onDescriptionDraftChange={handleDescriptionDraftChange}
          onDescriptionDraftClear={handleDescriptionDraftClear}
          onClose={() => setActiveTicket(null)}
        />
      ) : null}
    </>
  );
}
