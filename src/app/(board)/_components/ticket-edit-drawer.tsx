import { createPortal } from "react-dom";
import { type Ticket } from "@/lib/board/type";
import { z } from "zod";
import {
  TicketFormFields,
  type TicketFormValues,
} from "@/app/(board)/_components/ticket-form-fields";
import { updateTicketSchema } from "@/lib/validation/tickets-update";
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import {
  getTicketExpiryBadgeClassName,
  getTicketExpiryLabel,
  getTicketExpiryState,
} from "@/lib/board/ticket-expiry";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { formatUtcDate, formatUtcTimestamp } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";

function toDateInputValue(value: string) {
  return value.slice(0, 10);
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

export default function TicketEditDrawer({
  categoryName,
  ticket,
  categoryNames,
  referenceNowMs,
  descriptionDraft,
  onDescriptionDraftChange,
  onDescriptionDraftClear,
  onClose,
}: {
  categoryName: string;
  ticket: Ticket;
  categoryNames: Record<string, string>;
  referenceNowMs: number;
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
  const ticketExpiryState = getTicketExpiryState(
    ticket.expiryDate,
    referenceNowMs,
  );
  const ticketExpiryLabel = getTicketExpiryLabel(
    ticket.expiryDate,
    referenceNowMs,
  );

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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Expiry status
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getTicketExpiryBadgeClassName(ticketExpiryState)}`}
              >
                {ticketExpiryLabel}
              </span>
              <span className="text-sm text-slate-600">
                Due {formatUtcDate(ticket.expiryDate)}
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              className="hover:cursor-pointer sm:flex-1"
              onClick={handleDelete}
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
                          {formatUtcTimestamp(entry.createdAt)}
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
