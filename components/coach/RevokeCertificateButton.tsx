"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function RevokeCertificateButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const reason = window.prompt("Reason for revoking this certificate:");
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/certificates/${certificateId}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not revoke.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="danger" onClick={handleClick} loading={loading}>
        {loading ? "Revoking..." : "Revoke"}
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
