import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EnrollButton } from "@/components/coach/EnrollButton";

export default async function CourseSalesPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, subtitle, description, level, pricing_model, course_type, status, coach_profiles(slug, headline, profiles(display_name))")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!course || course.status !== "published") notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, lessons(id, title, lesson_type, is_required)")
    .eq("course_id", course.id)
    .order("position");

  const coach = (course as unknown as { coach_profiles: { slug: string; headline: string | null; profiles: { display_name: string } | null } | null })
    .coach_profiles;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone={course.pricing_model === "free" ? "success" : "primary"}>{course.pricing_model === "free" ? "Free" : "Paid"}</Badge>
        <Badge>{course.level}</Badge>
        <Badge>{course.course_type}</Badge>
      </div>
      <h1 className="text-3xl font-semibold">{course.title}</h1>
      {course.subtitle && <p className="mt-2 text-lg text-muted">{course.subtitle}</p>}
      {coach && <p className="mt-2 text-sm text-muted">Taught by {coach.profiles?.display_name ?? coach.slug}</p>}

      <div className="mt-6">
        <EnrollButton courseId={course.id} courseHref={`/learn/course/${course.id}`} />
      </div>

      {course.description && <p className="mt-8 whitespace-pre-line text-sm text-foreground">{course.description}</p>}

      <h2 className="mb-4 mt-10 text-lg font-semibold">Curriculum</h2>
      <div className="space-y-3">
        {(modules ?? []).map((m) => (
          <Card key={m.id}>
            <h3 className="font-medium">{m.title}</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {(m.lessons ?? []).map((l) => (
                <li key={l.id}>
                  {l.title} <span className="text-xs">({l.lesson_type}{l.is_required ? "" : ", optional"})</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
