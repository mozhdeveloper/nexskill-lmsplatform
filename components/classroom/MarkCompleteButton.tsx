"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function MarkCompleteButton({ lessonId, alreadyCompleted }: { lessonId: string; alreadyCompleted: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyCompleted) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark this lesson complete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Saving..." : "Mark lesson complete"}
      </Button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
