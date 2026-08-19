import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const statusTone: Record<string, "neutral" | "success" | "warning" | "primary"> = {
  draft: "neutral",
  submitted_for_review: "warning",
  under_review: "warning",
  approved: "primary",
  published: "success",
  rejected: "warning",
  unpublished: "neutral",
  archived: "neutral",
};

export default async function CoachCoursesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coachProfile } = await supabase.from("coach_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!coachProfile) redirect("/become-a-coach");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status")
    .eq("coach_profile_id", coachProfile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your courses</h1>
        <Link href="/coach/courses/new">
          <Button>New course</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {(courses ?? []).map((c) => (
          <Link key={c.id} href={`/coach/courses/${c.id}/builder`}>
            <Card className="flex items-center justify-between hover:border-primary">
              <p className="font-medium">{c.title}</p>
              <Badge tone={statusTone[c.status] ?? "neutral"}>{c.status.replace(/_/g, " ")}</Badge>
            </Card>
          </Link>
        ))}
        {(!courses || courses.length === 0) && (
          <Card>
            <p className="text-sm text-muted">No courses yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
