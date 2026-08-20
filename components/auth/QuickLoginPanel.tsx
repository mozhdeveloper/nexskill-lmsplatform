"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Seeded by scripts/seed.ts (see README) — for fast local/demo testing of each workspace only.
// Remove this component before a real production launch.
const DEMO_ACCOUNTS = [
  {
    key: "admin",
    label: "Admin",
    description: "Approve coaches, moderate courses, manage users",
    email: "admin@nexskill.dev",
    redirectTo: "/admin",
    icon: "🛡️",
  },
  {
    key: "coach",
    label: "Coach",
    description: "Build courses, review submissions, publish",
    email: "coach1@nexskill.dev",
    redirectTo: "/coach",
    icon: "🎓",
  },
  {
    key: "student",
    label: "Student",
    description: "Enroll, learn, submit assignments",
    email: "student1@nexskill.dev",
    redirectTo: "/learn",
    icon: "📚",
  },
] as const;

const DEMO_PASSWORD = "Nexskill!2026";

export function QuickLoginPanel() {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function quickLogin(email: string, redirectTo: string, key: string) {
    setLoadingKey(key);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    setLoadingKey(null);
    if (signInError) {
      setError("Demo account isn't seeded yet — run `npm run db:seed`.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          ⚡
        </span>
        <p className="text-sm font-semibold text-foreground">Quick demo login</p>
      </div>
      <p className="mb-4 text-xs text-muted">Jump straight into any workspace — no password needed.</p>
      <div className="space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.key}
            type="button"
            disabled={loadingKey !== null && loadingKey !== account.key}
            onClick={() => quickLogin(account.email, account.redirectTo, account.key)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-all duration-200 ease-soft",
              "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
              {loadingKey === account.key ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                account.icon
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{account.label}</span>
              <span className="block truncate text-xs text-muted">{account.description}</span>
            </span>
            <span className="text-xs font-medium text-primary">Enter →</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-error">{error}</p>}
    </div>
  );
}
