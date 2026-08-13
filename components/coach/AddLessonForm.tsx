"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

const lessonTypes = [
  "rich_text",
  "video",
  "practical_assignment",
  "quiz",
  "discussion",
  "project",
  "checklist",
  "survey",
];

export function AddLessonForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState("rich_text");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const lesson = await apiFetch<{ id: string }>(`/api/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({ title, lessonType }),
      });

      if (lessonType === "practical_assignment") {
        await apiFetch(`/api/courses/${courseId}/assignments`, {
          method: "POST",
          body: JSON.stringify({
            title: assignmentTitle || title,
            instructions: assignmentInstructions,
            lessonId: lesson.id,
            requiredSubmissionTypes: ["text"],
          }),
        });
      }

      setTitle("");
      setAssignmentTitle("");
      setAssignmentInstructions("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add lesson.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-xs">
        + Add lesson
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border bg-surface-raised p-3">
      <div>
        <Label>Lesson title</Label>
        <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Lesson type</Label>
        <select
          value={lessonType}
          onChange={(e) => setLessonType(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {lessonTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {lessonType === "practical_assignment" && (
        <>
          <div>
            <Label>Assignment title</Label>
            <Input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder={title || "Assignment title"} />
          </div>
          <div>
            <Label>Instructions (min. 10 characters)</Label>
            <Textarea required minLength={10} rows={3} value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} />
          </div>
          <p className="text-xs text-muted">This assignment requires a written (text) submission in this build.</p>
        </>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} variant="secondary">
          {loading ? "Saving..." : "Save lesson"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
