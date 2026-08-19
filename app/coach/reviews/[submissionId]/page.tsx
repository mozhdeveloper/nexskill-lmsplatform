import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSubmissionForReview } from "@/lib/domains/assessment/submissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReviewDecisionForm } from "@/components/coach/ReviewDecisionForm";
import { ForbiddenError, NotFoundError } from "@/lib/domains/identity/permissions";

export default async function SubmissionReviewPage({ params }: { params: { submissionId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let data;
  try {
    data = await getSubmissionForReview(supabase, user.id, params.submissionId);
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16">
          <Card>
            <p className="text-error">{err.message}</p>
          </Card>
        </div>
      );
    }
    throw err;
  }

  const { submission, assignment, files, reviews } = data;

  const { data: student } = await supabase.from("profiles").select("display_name").eq("id", submission.student_id).single();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{assignment.title}</h1>
        <Badge>Attempt {submission.attempt_number}</Badge>
      </div>
      <p className="mb-8 text-sm text-muted">Submitted by {student?.display_name ?? "Student"}</p>

      <Card className="mb-6">
        <h2 className="mb-2 font-semibold">Instructions</h2>
        <p className="whitespace-pre-line text-sm text-muted">{assignment.instructions}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Submitted files</h2>
        <ul className="space-y-2 text-sm">
          {files.map((f) => (
            <li key={f.id}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {f.title ?? f.submissionType} ({f.submissionType})
                </a>
              ) : (
                <span className="text-muted">{f.title ?? f.submissionType} (unavailable)</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {reviews.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Review history</h2>
          <ul className="space-y-3 text-sm">
            {reviews.map((r) => (
              <li key={r.id}>
                <Badge tone={r.decision === "passed" ? "success" : r.decision === "failed" ? "error" : "warning"}>{r.decision.replace("_", " ")}</Badge>
                {r.written_feedback && <p className="mt-1 text-muted">{r.written_feedback}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.canReview && ["submitted", "in_review"].includes(submission.status) ? (
        <Card>
          <ReviewDecisionForm submissionId={submission.id} />
        </Card>
      ) : (
        !data.canReview && (
          <Card>
            <p className="text-sm text-muted">You are viewing this submission read-only.</p>
          </Card>
        )
      )}
    </div>
  );
}
