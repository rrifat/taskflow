import type { ComponentPropsWithoutRef } from "react";

import { cx } from "@/lib/utils/cx";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "destructive";
  size?: "sm" | "md";
  fullWidth?: boolean;
};

const baseClassName =
  "inline-flex items-center justify-center rounded-full font-medium transition hover:cursor-pointer disabled:cursor-not-allowed";

const variantClassNames = {
  primary:
    "bg-teal-700 text-white shadow-sm hover:bg-teal-800 disabled:bg-teal-700/70 disabled:text-white/90",
  secondary:
    "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400",
  destructive:
    "border border-red-200 bg-red-50 text-red-700 shadow-sm hover:border-red-300 hover:bg-red-100 disabled:border-red-100 disabled:bg-red-50 disabled:text-red-300",
} as const;

const sizeClassNames = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-5 py-3 text-sm",
} as const;

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        baseClassName,
        variantClassNames[variant],
        sizeClassNames[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
