import type { ComponentPropsWithoutRef } from "react";

import { cx } from "@/lib/utils/cx";

type SurfaceCardProps = ComponentPropsWithoutRef<"div">;

export function SurfaceCard({ className, ...props }: SurfaceCardProps) {
  return (
    <div
      className={cx(
        "rounded-4xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
