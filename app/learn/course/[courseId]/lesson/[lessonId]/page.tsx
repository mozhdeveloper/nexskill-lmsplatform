import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClassroomState, assertLessonAccessible } from "@/lib/domains/enrollment/classroom";
import { CurriculumSidebar } from "@/components/classroom/CurriculumSidebar";
import { MarkCompleteButton } from "@/components/classroom/MarkCompleteButton";
import { AssignmentSubmissionForm } from "@/components/classroom/AssignmentSubmissionForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ForbiddenError, NotFoundError } from "@/lib/domains/identity/permissions";

export default async function LessonPage({ params }: { params: { courseId: string; lessonId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Server-side gate: a locked lesson must not render even if the URL is hit directly (§102).
  try {
    await assertLessonAccessible(supabase, user.id, params.lessonId);
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

  const state = await getClassroomState(supabase, user.id, params.courseId);
  const module = state.modules.find((m) => m.lessons.some((l) => l.id === params.lessonId));
  const lesson = module?.lessons.find((l) => l.id === params.lessonId);
  if (!lesson) redirect(`/learn/course/${params.courseId}`);

  let assignmentBlock: React.ReactNode = null;
  if (lesson.lessonType === "practical_assignment" && lesson.assignmentId) {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, title, instructions, required_submission_types, max_attempts")
      .eq("id", lesson.assignmentId)
      .single();

    const { data: attempts } = await supabase
      .from("submissions")
      .select("id, attempt_number, status, submitted_at")
      .eq("assignment_id", lesson.assignmentId)
      .eq("enrollment_id", state.enrollmentId)
      .order("attempt_number", { ascending: false });

    const { data: latestReview } = attempts && attempts[0]
      ? await supabase
          .from("submission_reviews")
          .select("decision, written_feedback, reviewed_at")
          .eq("submission_id", attempts[0].id)
          .order("reviewed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    const latest = attempts?.[0];
    const canSubmit = !latest || ["revision_required", "failed"].includes(latest.status);
    const blockedReason =
      latest?.status === "passed"
        ? "You have already passed this assignment."
        : latest?.status && ["submitted", "in_review"].includes(latest.status)
        ? "Your submission is waiting for coach review."
        : assignment?.max_attempts && (attempts?.length ?? 0) >= assignment.max_attempts
        ? "Maximum attempts reached."
        : null;

    assignmentBlock = (
      <div className="mt-6 space-y-4">
        <Card>
          <h2 className="font-semibold">{assignment?.title}</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted">{assignment?.instructions}</p>
        </Card>

        {latest && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Attempt {latest.attempt_number}</p>
              <Badge
                tone={
                  latest.status === "passed" ? "success" : latest.status === "revision_required" || latest.status === "failed" ? "warning" : "primary"
                }
              >
                {latest.status.replace("_", " ")}
              </Badge>
            </div>
            {latestReview?.written_feedback && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-foreground">Coach feedback: </span>
                {latestReview.written_feedback}
              </p>
            )}
          </Card>
        )}

        <Card>
          <AssignmentSubmissionForm
            userId={user.id}
            assignmentId={lesson.assignmentId}
            requiredSubmissionTypes={assignment?.required_submission_types ?? ["text"]}
            canSubmit={canSubmit}
            blockedReason={blockedReason}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <CurriculumSidebar state={state} activeLessonId={lesson.id} />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        <Card className="mt-4">
          <LessonContentRenderer lessonType={lesson.lessonType} />
        </Card>
        {assignmentBlock}
        {lesson.lessonType !== "practical_assignment" && (
          <div className="mt-6">
            <MarkCompleteButton lessonId={lesson.id} alreadyCompleted={lesson.progressStatus === "completed"} />
          </div>
        )}
      </div>
    </div>
  );
}

function LessonContentRenderer({ lessonType }: { lessonType: string }) {
  switch (lessonType) {
    case "video":
      return <p className="text-sm text-muted">Video lesson — playback requires a VideoProvider integration (P1). See docs/nexskill-architecture.md §6.</p>;
    case "rich_text":
    case "discussion":
    case "project":
    case "checklist":
    case "survey":
      return <p className="text-sm text-muted">Lesson content goes here.</p>;
    default:
      return <p className="text-sm text-muted">This lesson type ({lessonType}) will render its dedicated component.</p>;
  }
}
