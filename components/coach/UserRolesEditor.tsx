"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ROLE_OPTIONS = [
  { key: "student", label: "Student" },
  { key: "coach", label: "Coach" },
  { key: "sub_coach", label: "Sub-Coach" },
  { key: "support", label: "Support" },
  { key: "finance_admin", label: "Finance Admin" },
  { key: "content_moderator", label: "Content Moderator" },
  { key: "super_admin", label: "Super Admin" },
] as const;

export function UserRolesEditor({ userId, currentRoles }: { userId: string; currentRoles: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState<string[]>(currentRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(key: string) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function handleSave() {
    if (roles.length === 0) {
      setError("At least one role is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/roles`, { method: "PATCH", body: JSON.stringify({ roles }) });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update roles.");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {currentRoles.map((role) => (
          <Badge key={role} tone="primary">
            {role.replace(/_/g, " ")}
          </Badge>
        ))}
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border border-border bg-surface-raised p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {ROLE_OPTIONS.map((role) => (
          <label
            key={role.key}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/10"
          >
            <input type="checkbox" checked={roles.includes(role.key)} onChange={() => toggleRole(role.key)} className="h-3 w-3 accent-primary" />
            {role.label}
          </label>
        ))}
      </div>
      {error && <p className="mb-2 text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" loading={loading} onClick={handleSave}>
          Save roles
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
