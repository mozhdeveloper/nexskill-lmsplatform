"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

export function SettingToggle({ settingKey, label, initialValue }: { settingKey: string; label: string; initialValue: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const next = !value;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/settings/${settingKey}`, { method: "PATCH", body: JSON.stringify({ value: next }) });
      setValue(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update setting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted">{settingKey}</p>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-error">{error}</span>}
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-surface-raised border border-border"}`}
        >
          <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}
