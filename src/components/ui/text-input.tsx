import type { ComponentPropsWithRef } from "react";

import { cx } from "@/lib/utils/cx";

type TextInputProps = ComponentPropsWithRef<"input">;

export function TextInput({ className, ...props }: TextInputProps) {
  return (
    <input
      className={cx(
        "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500",
        className,
      )}
      {...props}
    />
  );
}
