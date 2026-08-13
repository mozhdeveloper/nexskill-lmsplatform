"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function SuspendUserButton({ userId, status }: { userId: string; status: "active" | "suspended" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ action: status === "active" ? "suspend" : "reinstate" }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={status === "active" ? "danger" : "secondary"} onClick={handleClick} disabled={loading}>
        {loading ? "Saving..." : status === "active" ? "Suspend" : "Reinstate"}
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
