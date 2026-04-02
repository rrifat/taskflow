import type { ComponentPropsWithoutRef } from "react";

import { cx } from "@/lib/utils/cx";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

const baseClassName =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed";

const variantClassNames = {
  primary: "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-400",
  secondary:
    "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400",
} as const;

export function Button({
  className,
  variant = "primary",
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        baseClassName,
        variantClassNames[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
