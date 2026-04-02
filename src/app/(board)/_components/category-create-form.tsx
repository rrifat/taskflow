"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import FormFieldError from "@/app/(auth)/_components/form-field-error";
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { createCategorySchema } from "@/lib/validation/categories";
import { z } from "zod";

export function CategoryCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const parsed = createCategorySchema.safeParse({ name });

    if (!parsed.success) {
      const { formErrors, fieldErrors } = z.flattenError(parsed.error);
      setErrors({ formErrors, fieldErrors });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/categories", {
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

      setName("");
      router.refresh();
    } catch {
      setErrors({
        formErrors: [
          "Unable to create a category right now. Please try again.",
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="w-full max-w-md space-y-3"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="new-category-name">
            New category name
          </label>
          <input
            id="new-category-name"
            className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
            type="text"
            name="name"
            placeholder="Add a category"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <button
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 hover:cursor-pointer"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>

      {errors.formErrors?.[0] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errors.formErrors[0]}
        </div>
      ) : null}

      <FormFieldError errors={errors.fieldErrors} fieldName="name" />
    </form>
  );
}
