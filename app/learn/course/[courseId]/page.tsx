import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClassroomState } from "@/lib/domains/enrollment/classroom";
import { CurriculumSidebar } from "@/components/classroom/CurriculumSidebar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ClassroomPage({ params }: { params: { courseId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const state = await getClassroomState(supabase, user.id, params.courseId);

  const firstUnlockedLesson = state.modules.flatMap((m) => (m.status !== "locked" ? m.lessons : [])).find((l) => l.progressStatus !== "completed");
  if (firstUnlockedLesson) {
    redirect(`/learn/course/${params.courseId}/lesson/${firstUnlockedLesson.id}`);
  }

  return (
    <div className="flex min-h-screen">
      <CurriculumSidebar state={state} />
      <main className="flex-1 p-8">
        <Card>
          {state.enrollmentStatus === "completed" ? (
            <>
              <Badge tone="success">Course completed</Badge>
              <h1 className="mt-3 text-xl font-semibold">You&apos;ve completed {state.courseTitle}</h1>
              <p className="mt-2 text-sm text-muted">Check your certificates on your dashboard.</p>
            </>
          ) : (
            <p className="text-sm text-muted">All currently unlocked lessons are complete. Waiting on instructor review to unlock more.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
