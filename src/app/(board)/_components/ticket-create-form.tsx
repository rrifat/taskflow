"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import FormFieldError from "@/components/ui/form-field-error";
import { TextInput } from "@/components/ui/text-input";
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { createTicketSchema } from "@/lib/validation/tickets";

type TicketCreateFormProps = {
  categoryId: string;
  categoryName: string;
};

function getDefaultExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function TicketCreateForm({
  categoryId,
  categoryName,
}: TicketCreateFormProps) {
  const router = useRouter();
  const [ticketFields, setTicketFields] = useReducer(
    (state, newFields) => ({ ...state, ...newFields }),
    {
      title: "",
      description: "",
      expiryDate: getDefaultExpiryDate(),
    },
  );
  const { title, description, expiryDate } = ticketFields;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsExpanded(false);
        setErrors({});
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded, isSubmitting]);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const normalizedExpiryDate = expiryDate
      ? new Date(`${expiryDate}T00:00:00.000Z`).toISOString()
      : "";

    const parsed = createTicketSchema.safeParse({
      categoryId,
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
      const response = await fetch("/api/tickets", {
        method: "POST",
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

      setTicketFields({
        title: "",
        description: "",
        expiryDate: getDefaultExpiryDate(),
      });
      setIsExpanded(false);
      router.refresh();
    } catch {
      setErrors({
        formErrors: ["Unable to create a ticket right now. Please try again."],
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => {
          setIsExpanded(true);
          setErrors({});
        }}
      >
        New Ticket
      </Button>

      {isExpanded && isMounted
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px]"
                onClick={() => {
                  if (!isSubmitting) {
                    setIsExpanded(false);
                    setErrors({});
                  }
                }}
              />
              <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Create ticket
                    </p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {categoryName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                    onClick={() => {
                      setIsExpanded(false);
                      setErrors({});
                    }}
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
                    Add a new ticket to this column without disrupting the board
                    layout. You can refine the details later.
                  </p>

                  <FormErrorBanner message={errors.formErrors?.[0]} />

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-800">
                      Title
                    </span>
                    <TextInput
                      name="title"
                      placeholder="Write a short ticket title"
                      value={title}
                      onChange={(event) =>
                        setTicketFields({ title: event.target.value })
                      }
                    />
                    <FormFieldError
                      errors={errors.fieldErrors}
                      fieldName="title"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-800">
                      Description
                    </span>
                    <textarea
                      className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
                      name="description"
                      placeholder="Add a concise description"
                      value={description}
                      onChange={(event) =>
                        setTicketFields({ description: event.target.value })
                      }
                    />
                    <FormFieldError
                      errors={errors.fieldErrors}
                      fieldName="description"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-800">
                      Expiry date
                    </span>
                    <TextInput
                      type="date"
                      name="expiryDate"
                      value={expiryDate}
                      onChange={(event) =>
                        setTicketFields({ expiryDate: event.target.value })
                      }
                    />
                    <FormFieldError
                      errors={errors.fieldErrors}
                      fieldName="expiryDate"
                    />
                  </label>

                  <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="sm:flex-1"
                    >
                      {isSubmitting ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </aside>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
