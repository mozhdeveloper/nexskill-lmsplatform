import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReviewQueue } from "@/lib/domains/assessment/submissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ReviewQueuePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queue = await getReviewQueue(supabase, user.id);

  const studentIds = Array.from(new Set(queue.map((q) => q.student_id)));
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", studentIds)
    : { data: [] };
  const studentNameById = new Map((students ?? []).map((s) => [s.id, s.display_name]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Review queue</h1>
      {queue.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nothing waiting for review right now.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((s) => (
            <Link key={s.id} href={`/coach/reviews/${s.id}`}>
              <Card className="flex items-center justify-between hover:border-primary">
                <div>
                  <p className="font-medium">{s.assignmentTitle}</p>
                  <p className="text-sm text-muted">{studentNameById.get(s.student_id) ?? "Student"} · Attempt {s.attempt_number}</p>
                </div>
                <Badge tone={s.status === "in_review" ? "warning" : "primary"}>{s.status.replace("_", " ")}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
