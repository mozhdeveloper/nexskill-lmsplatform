"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Root error boundary (Next.js convention — must be a Client Component). Catches unexpected
 * throws from any page/layout below it that doesn't have a more specific error.tsx. Server
 * error details are intentionally not shown to the user (§65) — they're already logged
 * server-side with a request ID by lib/api-error.ts for API routes; for page renders, Next
 * logs the original error to the server console.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-dot-grid px-4">
      <Card className="max-w-md animate-scale-in text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-2xl text-error">
          !
        </div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error occurred while loading this page.
          {error.digest && <span className="mt-1 block font-mono text-xs text-muted">Ref: {error.digest}</span>}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
