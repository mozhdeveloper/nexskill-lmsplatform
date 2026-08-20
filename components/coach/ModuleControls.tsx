"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export function ModuleControls({
  moduleId,
  title,
  description,
  isFirst,
  isLast,
}: {
  moduleId: string;
  title: string;
  description: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading("save");
    setError(null);
    try {
      await apiFetch(`/api/modules/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: titleValue, description: descriptionValue || null }),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This also deletes its lessons. This can't be undone.`)) return;
    setLoading("delete");
    setError(null);
    try {
      await apiFetch(`/api/modules/${moduleId}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this module.");
      setLoading(null);
    }
  }

  async function handleReorder(direction: "up" | "down") {
    setLoading(direction);
    setError(null);
    try {
      await apiFetch(`/api/modules/${moduleId}/reorder`, { method: "POST", body: JSON.stringify({ direction }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reorder.");
    } finally {
      setLoading(null);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <Label>Module title</Label>
          <Input required value={titleValue} onChange={(e) => setTitleValue(e.target.value)} />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea rows={2} value={descriptionValue} onChange={(e) => setDescriptionValue(e.target.value)} />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="secondary" loading={loading === "save"}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={loading !== null}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Move up"
            onClick={() => handleReorder("up")}
            disabled={isFirst || loading !== null}
            className="rounded p-1 text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            onClick={() => handleReorder("down")}
            disabled={isLast || loading !== null}
            className="rounded p-1 text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-30"
          >
            ↓
          </button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={loading !== null}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="danger" loading={loading === "delete"} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
