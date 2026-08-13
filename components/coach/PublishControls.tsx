"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function PublishControls({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitForReview() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${courseId}/submit-for-review`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit course.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "published") {
    return <p className="text-sm text-success">This course is live.</p>;
  }
  if (status === "submitted_for_review" || status === "under_review") {
    return <p className="text-sm text-warning">Waiting on admin review.</p>;
  }

  return (
    <div>
      <Button onClick={handleSubmitForReview} disabled={loading}>
        {loading ? "Submitting..." : "Submit & publish"}
      </Button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
