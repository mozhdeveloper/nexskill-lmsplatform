"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CoachError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Coach section error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card className="animate-scale-in text-center">
        <h1 className="text-lg font-semibold">Couldn&apos;t load this page</h1>
        <p className="mt-2 text-sm text-muted">Something went wrong loading Coach Studio.</p>
        <Button className="mt-6" variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
