export type FormErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};
export function normalizeFormErrors(payload: unknown): FormErrors {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null
  ) {
    const { formErrors, fieldErrors, message } = payload.error as {
      message?: string;
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    };

    return {
      formErrors:
        formErrors && formErrors.length > 0
          ? formErrors
          : message
            ? [message]
            : undefined,
      fieldErrors: fieldErrors,
    };
  }

  return {
    formErrors: ["Something went wrong. Please try again."],
  };
}
