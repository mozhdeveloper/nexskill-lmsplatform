import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UnpublishCourseButton } from "@/components/coach/UnpublishCourseButton";

export default async function AdminCoursesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, coach_profiles(slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold">All courses</h1>
      <p className="mb-8 text-sm text-muted">Platform-wide moderation. Course content itself is edited by its coach in Coach Studio.</p>
      <div className="space-y-2">
        {(courses ?? []).map((c) => {
          const coach = c.coach_profiles as unknown as { slug: string } | null;
          return (
            <Card key={c.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/courses/${c.slug}`} className="font-medium hover:text-primary hover:underline" target="_blank">
                  {c.title}
                </Link>
                <p className="text-xs text-muted">{coach?.slug}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={c.status === "published" ? "success" : "neutral"}>{c.status.replace(/_/g, " ")}</Badge>
                {c.status === "published" && <UnpublishCourseButton courseId={c.id} title={c.title} />}
              </div>
            </Card>
          );
        })}
        {(!courses || courses.length === 0) && (
          <Card>
            <p className="text-sm text-muted">No courses yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
