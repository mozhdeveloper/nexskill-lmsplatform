"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// Seeded by scripts/seed.ts (see README) — for fast local/demo testing of each workspace only.
// Remove this component before a real production launch.
const DEMO_ACCOUNTS = [
  { key: "admin", label: "Admin", email: "admin@nexskill.dev", redirectTo: "/admin" },
  { key: "coach", label: "Coach", email: "coach1@nexskill.dev", redirectTo: "/coach" },
  { key: "student", label: "Student", email: "student1@nexskill.dev", redirectTo: "/learn" },
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
    <div className="mt-6 rounded-lg border border-dashed border-border p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Quick demo login</p>
      <div className="flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.key}
            type="button"
            variant="secondary"
            size="sm"
            loading={loadingKey === account.key}
            disabled={loadingKey !== null && loadingKey !== account.key}
            onClick={() => quickLogin(account.email, account.redirectTo, account.key)}
          >
            {account.label}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
