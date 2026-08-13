import { clsx } from "clsx";

type Tone = "neutral" | "success" | "warning" | "error" | "primary";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-surface-raised text-muted border border-border",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "error" && "bg-error/10 text-error",
        tone === "primary" && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </span>
  );
}
