"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 ease-soft active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-soft-lg hover:-translate-y-0.5",
        variant === "secondary" &&
          "border border-border bg-surface-raised text-foreground hover:border-primary/40 hover:-translate-y-0.5",
        variant === "ghost" && "text-foreground hover:bg-surface-raised",
        variant === "danger" && "bg-error text-white shadow-soft hover:opacity-90 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {loading && <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}
