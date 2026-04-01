"use client";

import { loginSchema, registerSchema } from "@/lib/validation/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { z } from "zod";
import FormFieldError from "./form-field-error";

type AuthMode = "login" | "register";

type FormErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

type AuthFormProps = {
  mode: AuthMode;
};

const authContent = {
  login: {
    title: "Welcome back",
    description:
      "Sign in with your account to continue into the board experience.",
    submitLabel: "Sign in",
    endpoint: "/api/auth/login",
    alternateLabel: "Need an account?",
    alternateHref: "/register",
    alternateCta: "Create one",
  },
  register: {
    title: "Create your account",
    description:
      "Register with your name, email, and password to start using Taskflow.",
    submitLabel: "Create account",
    endpoint: "/api/auth/register",
    alternateLabel: "Already have an account?",
    alternateHref: "/login",
    alternateCta: "Sign in",
  },
} as const;

function normalizeErrors(payload: unknown): FormErrors {
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

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [formFields, setFormFields] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {
      name: "",
      email: "",
      password: "",
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { name, email, password } = formFields;

  const isRegister = mode === "register";
  const content = authContent[mode];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const payload = isRegister
      ? { name, email, password }
      : { email, password };
    const parsed = isRegister
      ? registerSchema.safeParse(payload)
      : loginSchema.safeParse(payload);

    if (!parsed.success) {
      const { formErrors, fieldErrors } = z.flattenError(parsed.error);
      setErrors({
        formErrors,
        fieldErrors,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(content.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setErrors(normalizeErrors(payload));
        return;
      }

      router.push("/board");
      router.refresh();
    } catch {
      setErrors({
        formErrors: ["Unable to reach the server right now. Please try again."],
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const formError = errors.formErrors?.[0];

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
        Authentication
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {content.title}
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {content.description}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        {isRegister ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Name</span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setFormFields({ name: event.target.value })}
            />
            <FormFieldError errors={errors.fieldErrors} fieldName="name" />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setFormFields({ email: event.target.value })}
          />
          <FormFieldError errors={errors.fieldErrors} fieldName="email" />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Password</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
            type="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) =>
              setFormFields({ password: event.target.value })
            }
          />
          <FormFieldError errors={errors.fieldErrors} fieldName="password" />
        </label>

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : content.submitLabel}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {content.alternateLabel}{" "}
          <Link
            href={content.alternateHref}
            className="font-medium text-slate-950 underline-offset-4 hover:underline"
          >
            {content.alternateCta}
          </Link>
        </p>
        <Link
          href="/"
          className="font-medium text-slate-950 underline-offset-4 hover:underline"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
