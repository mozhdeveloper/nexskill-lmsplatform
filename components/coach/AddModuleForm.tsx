"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AddModuleForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${courseId}/modules`, { method: "POST", body: JSON.stringify({ title }) });
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add module.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input placeholder="New module title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" disabled={loading} variant="secondary">
        {loading ? "Adding..." : "Add module"}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </form>
  );
}
