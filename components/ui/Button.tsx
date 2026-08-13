"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "secondary" && "bg-surface-raised border border-border text-foreground hover:bg-surface",
        variant === "ghost" && "text-foreground hover:bg-surface-raised",
        variant === "danger" && "bg-error text-white hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}
