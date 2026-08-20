"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function UnpublishCourseButton({ courseId, title }: { courseId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`Unpublish "${title}"? It will no longer be enrollable; existing students keep access.`)) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${courseId}/unpublish`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unpublish this course.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="danger" size="sm" loading={loading} onClick={handleClick}>
        Unpublish
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
