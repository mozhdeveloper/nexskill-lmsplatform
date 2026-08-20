"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const ROLE_OPTIONS = [
  { key: "student", label: "Student" },
  { key: "coach", label: "Coach" },
  { key: "sub_coach", label: "Sub-Coach" },
  { key: "support", label: "Support" },
  { key: "finance_admin", label: "Finance Admin" },
  { key: "content_moderator", label: "Content Moderator" },
  { key: "super_admin", label: "Super Admin" },
] as const;

export function CreateUserForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>(["student"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggleRole(key: string) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const account = await apiFetch<{ email: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ displayName, email, password, roles }),
      });
      setSuccess(`Account created for ${account.email}.`);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRoles(["student"]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Display name</Label>
        <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>Temporary password (min. 8 characters)</Label>
        <Input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="mt-1 text-xs text-muted">Share this with the person directly — there&apos;s no invite email flow yet.</p>
      </div>
      <div>
        <Label>Roles</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((role) => (
            <label
              key={role.key}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                checked={roles.includes(role.key)}
                onChange={() => toggleRole(role.key)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" loading={loading}>
        Create account
      </Button>
    </form>
  );
}
