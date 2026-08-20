"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { AuthBrandPanel } from "@/components/marketing/AuthBrandPanel";
import { QuickLoginPanel } from "@/components/auth/QuickLoginPanel";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/learn");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-dot-grid px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-soft">
              N
            </span>
            NexSkill
          </Link>

          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-6 text-sm text-muted">Sign in to continue learning or teaching.</p>

          <QuickLoginPanel />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Or sign in manually</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" loading={loading} variant="secondary" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted">
            No account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
