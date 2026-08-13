"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function ProgressionRuleForm({
  courseId,
  moduleId,
  currentRuleType,
  assignments,
}: {
  courseId: string;
  moduleId: string;
  currentRuleType: string;
  assignments: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [ruleType, setRuleType] = useState(currentRuleType);
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${courseId}/progression-rules`, {
        method: "POST",
        body: JSON.stringify({
          targetType: "module",
          targetId: moduleId,
          ruleType,
          config: ruleType === "assignment_gated" ? { assignmentId } : {},
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save rule.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">Unlocks when:</span>
      <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className="rounded border border-border bg-surface px-2 py-1">
        <option value="open">Always open</option>
        <option value="sequential">Previous module completed</option>
        <option value="assignment_gated">Specific assignment passed</option>
      </select>
      {ruleType === "assignment_gated" && (
        <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="rounded border border-border bg-surface px-2 py-1">
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      )}
      <Button type="button" variant="ghost" onClick={handleSave} disabled={loading} className="text-xs">
        {loading ? "Saving..." : "Save"}
      </Button>
      {error && <span className="text-error">{error}</span>}
    </div>
  );
}
