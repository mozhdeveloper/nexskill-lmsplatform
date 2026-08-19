import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReviewQueue } from "@/lib/domains/assessment/submissions";
import { Card } from "@/components/ui/Card";

export default async function CoachDashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coachProfile } = await supabase.from("coach_profiles").select("id, status").eq("user_id", user.id).maybeSingle();
  if (!coachProfile) redirect("/become-a-coach");

  const { data: courses } = await supabase.from("courses").select("id, status").eq("coach_profile_id", coachProfile.id);
  const queue = await getReviewQueue(supabase, user.id);

  const courseIds = (courses ?? []).map((c) => c.id);
  const { count: enrollmentCount } = courseIds.length
    ? await supabase.from("enrollments").select("id", { count: "exact", head: true }).in("course_id", courseIds)
    : { count: 0 };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Coach dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Submissions waiting for review</p>
          <p className="mt-1 text-3xl font-semibold">{queue.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Courses</p>
          <p className="mt-1 text-3xl font-semibold">{courses?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Enrollments</p>
          <p className="mt-1 text-3xl font-semibold">{enrollmentCount ?? 0}</p>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/coach/reviews" className="text-primary underline">
          Go to review queue →
        </Link>
        <Link href="/coach/courses" className="text-primary underline">
          Manage courses →
        </Link>
      </div>
    </div>
  );
}
