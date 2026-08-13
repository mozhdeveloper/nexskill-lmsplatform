"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function BecomeACoachPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    publicName: "",
    legalName: "",
    country: "",
    bio: "",
    expertise: "",
    proposedCategories: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/coach-applications", {
        method: "POST",
        body: JSON.stringify({
          publicName: form.publicName,
          legalName: form.legalName,
          country: form.country,
          bio: form.bio,
          expertise: form.expertise.split(",").map((s) => s.trim()).filter(Boolean),
          proposedCategories: form.proposedCategories.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setSuccess(true);
      setTimeout(() => router.push("/learn"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <h1 className="text-xl font-semibold text-success">Application submitted</h1>
          <p className="mt-2 text-sm text-muted">
            An admin will review your application. You&apos;ll see the decision on your dashboard.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold">Become a Nexskill coach</h1>
      <p className="mb-6 text-sm text-muted">
        Tell us about your expertise. Approved coaches get access to Coach Studio to build and publish courses.
      </p>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Public instructor name</Label>
            <Input required value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} />
          </div>
          <div>
            <Label>Legal name</Label>
            <Input required value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </div>
          <div>
            <Label>Country</Label>
            <Input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <Label>Bio (min. 50 characters)</Label>
            <Textarea required minLength={50} rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <Label>Expertise (comma-separated)</Label>
            <Input required placeholder="Microblading, Aesthetics" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />
          </div>
          <div>
            <Label>Proposed categories (comma-separated)</Label>
            <Input required placeholder="Beauty, Business" value={form.proposedCategories} onChange={(e) => setForm({ ...form, proposedCategories: e.target.value })} />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
