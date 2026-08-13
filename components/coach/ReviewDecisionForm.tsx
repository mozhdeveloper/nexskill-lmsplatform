"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";

export function ReviewDecisionForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "pass" | "request-revision" | "fail") {
    setLoading(action);
    setError(null);
    try {
      await apiFetch(`/api/submissions/${submissionId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ writtenFeedback: feedback }),
      });
      router.push("/coach/reviews");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record decision.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Feedback for the student</Label>
        <Textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => decide("pass")} disabled={loading !== null}>
          {loading === "pass" ? "Saving..." : "Pass"}
        </Button>
        <Button variant="secondary" onClick={() => decide("request-revision")} disabled={loading !== null}>
          {loading === "request-revision" ? "Saving..." : "Request revision"}
        </Button>
        <Button variant="danger" onClick={() => decide("fail")} disabled={loading !== null}>
          {loading === "fail" ? "Saving..." : "Fail"}
        </Button>
      </div>
    </div>
  );
}
