"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const course = await apiFetch<{ id: string }>("/api/courses", {
        method: "POST",
        body: JSON.stringify({ title, subtitle, description }),
      });
      router.push(`/coach/courses/${course.id}/builder`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">New course</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create draft"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
