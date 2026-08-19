import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function StudentDashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status, course_id, courses(id, title, slug)")
    .eq("student_id", user.id)
    .order("started_at", { ascending: false });

  const { data: revisionSubmissions } = await supabase
    .from("submissions")
    .select("id, assignment_id, status, assignments(title, course_id, courses(title))")
    .eq("student_id", user.id)
    .eq("status", "revision_required");

  const { data: certificates } = await supabase.from("certificates").select("id, certificate_number, course_id, courses(title)").eq("student_id", user.id);

  const active = (enrollments ?? []).filter((e) => e.status === "active");
  const completed = (enrollments ?? []).filter((e) => e.status === "completed");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">My learning</h1>
        <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>
      </div>

      {revisionSubmissions && revisionSubmissions.length > 0 && (
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Revision requested</h2>
          <div className="space-y-2">
            {revisionSubmissions.map((s) => {
              const assignment = s.assignments as unknown as { title: string; course_id: string; courses: { title: string } | null } | null;
              return (
                <Card key={s.id} className="flex items-center justify-between border-warning/30">
                  <div>
                    <p className="font-medium">{assignment?.title}</p>
                    <p className="text-sm text-muted">{assignment?.courses?.title}</p>
                  </div>
                  <Badge tone="warning">Revision required</Badge>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Continue learning</h2>
        {active.length === 0 ? (
          <Card className="bg-dot-grid text-center">
            <p className="text-sm text-muted">
              You&apos;re not enrolled in anything yet.{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                Browse courses
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {active.map((e) => {
              const course = e.courses as unknown as { id: string; title: string } | null;
              return (
                <Link key={e.id} href={`/learn/course/${e.course_id}`}>
                  <Card hoverable className="group h-full">
                    <p className="font-medium transition-colors group-hover:text-primary">{course?.title}</p>
                    <p className="mt-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Continue →
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {certificates && certificates.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Certificates</h2>
          <div className="space-y-2">
            {certificates.map((c) => {
              const course = c.courses as unknown as { title: string } | null;
              return (
                <Link key={c.id} href={`/learn/certificates/${c.id}`}>
                  <Card hoverable className="flex items-center justify-between">
                    <p className="font-medium">{course?.title}</p>
                    <Badge tone="success">{c.certificate_number}</Badge>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {completed.length > 0 && certificates?.length === 0 && (
        <p className="mt-4 text-sm text-muted">Course completed — your certificate is being issued.</p>
      )}
    </div>
  );
}
