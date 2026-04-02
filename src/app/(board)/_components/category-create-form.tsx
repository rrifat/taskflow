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
          <TextInput
            id="new-category-name"
            className="rounded-full"
            type="text"
            name="name"
            placeholder="Add a category"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="hover:cursor-pointer"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>

      <FormErrorBanner message={errors.formErrors?.[0]} />

      <FormFieldError errors={errors.fieldErrors} fieldName="name" />
    </form>
  );
}
