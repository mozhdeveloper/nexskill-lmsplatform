"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function EnrollButton({ courseId, courseHref }: { courseId: string; courseHref: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      router.push(courseHref);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not enroll.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleEnroll} disabled={loading}>
        {loading ? "Enrolling..." : "Enroll for free"}
      </Button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
