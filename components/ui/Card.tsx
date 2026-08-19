import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  hoverable = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-border bg-surface p-6 transition-all duration-300 ease-soft",
        hoverable && "hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft-lg",
        className
      )}
      {...props}
    />
  );
}
