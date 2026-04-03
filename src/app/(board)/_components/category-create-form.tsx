"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import FormFieldError from "@/components/ui/form-field-error";
import { TextInput } from "@/components/ui/text-input";
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
    <form className="w-full space-y-3" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 space-y-2">
          <label className="sr-only" htmlFor="new-category-name">
            New category name
          </label>
          <TextInput
            id="new-category-name"
            className="min-h-13 rounded-[1.1rem] border-slate-200 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus:border-teal-500"
            type="text"
            name="name"
            placeholder="Add a category"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <FormFieldError errors={errors.fieldErrors} fieldName="name" />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-13 w-full px-6 shadow-[0_18px_35px_-22px_rgba(15,118,110,0.9)] sm:w-auto"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>

      <FormErrorBanner message={errors.formErrors?.[0]} />
    </form>
  );
}
