"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import FormFieldError from "@/components/ui/form-field-error";
import { SurfaceCard } from "@/components/ui/surface-card";
import { TextInput } from "@/components/ui/text-input";
import { normalizeFormErrors, type FormErrors } from "@/lib/utils/api-errors";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import Link from "next/link";
import { z } from "zod";

type AuthMode = "login" | "register";

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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { name, email, password } = formFields;

  const isRegister = mode === "register";
  const content = authContent[mode];
  const isBusy = isSubmitting || isRedirecting;

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

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
        setErrors(normalizeFormErrors(payload));
        setIsSubmitting(false);
        return;
      }

      setIsRedirecting(true);
      router.replace("/board");
      router.refresh();
    } catch {
      setErrors({
        formErrors: ["Unable to reach the server right now. Please try again."],
      });
      setIsSubmitting(false);
    }
  }

  const formError = errors.formErrors?.[0];

  return (
    <SurfaceCard className="rounded-4xl p-8">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
        Authentication
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {content.title}
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {content.description}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <FormErrorBanner message={formError} />

        {isRegister ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Name</span>
            <TextInput
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
          <TextInput
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
          <TextInput
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

        <Button type="submit" disabled={isBusy} fullWidth>
          {isBusy ? "Submitting..." : content.submitLabel}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {content.alternateLabel}{" "}
          <Link
            href={content.alternateHref}
            className="font-medium text-teal-800 underline-offset-4 hover:underline"
          >
            {content.alternateCta}
          </Link>
        </p>
        {mode === "register" && (
          <Link
            href="/login"
            className="font-medium text-teal-800 underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        )}
      </div>
    </SurfaceCard>
  );
}
