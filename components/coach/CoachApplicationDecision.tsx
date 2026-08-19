"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";

export function CoachApplicationDecision({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading("approve");
    setError(null);
    try {
      await apiFetch(`/api/coach-applications/${applicationId}/approve`, {
        method: "POST",
        body: JSON.stringify({ reviewNotes: notes }),
      });
      router.push("/admin/coaches");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve.");
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    if (!notes.trim()) {
      setError("A reason is required to reject.");
      return;
    }
    setLoading("reject");
    setError(null);
    try {
      await apiFetch(`/api/coach-applications/${applicationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reviewNotes: notes }),
      });
      router.push("/admin/coaches");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Review notes (required to reject)</Label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={approve} disabled={loading !== null && loading !== "approve"} loading={loading === "approve"}>
          Approve
        </Button>
        <Button
          variant="danger"
          onClick={reject}
          disabled={loading !== null && loading !== "reject"}
          loading={loading === "reject"}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
