import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EnrollButton } from "@/components/coach/EnrollButton";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const lessonTypeIcon: Record<string, string> = {
  video: "▶",
  rich_text: "📄",
  practical_assignment: "✏️",
  quiz: "❓",
  exam: "📝",
  checklist: "☑",
  discussion: "💬",
  project: "🧩",
  survey: "📊",
  audio: "🎧",
  pdf: "📎",
  file_download: "⬇",
  presentation: "🖥",
  external_resource: "🔗",
  live_class: "🎥",
};

export default async function CourseSalesPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, subtitle, description, level, pricing_model, course_type, status, coach_profiles(slug, headline, profiles(display_name))")
    .eq("slug", params.slug)
    .maybeSingle<{
      id: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      level: string;
      pricing_model: string;
      course_type: string;
      status: string;
      coach_profiles: { slug: string; headline: string | null; profiles: { display_name: string } | null } | null;
    }>();

  if (!course || course.status !== "published") notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, lessons(id, title, lesson_type, is_required)")
    .eq("course_id", course.id)
    .order("position")
    .returns<Array<{ id: string; title: string; lessons: { id: string; title: string; lesson_type: string; is_required: boolean }[] }>>();

  const coach = (course as unknown as { coach_profiles: { slug: string; headline: string | null; profiles: { display_name: string } | null } | null })
    .coach_profiles;

  const lessonCount = (modules ?? []).reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);

  return (
    <>
      <SiteHeader />
      <div className="bg-dot-grid">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-14 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 animate-fade-in-up">
            <Badge tone={course.pricing_model === "free" ? "success" : "primary"}>{course.pricing_model === "free" ? "Free" : "Paid"}</Badge>
            <Badge>{course.level.replace(/_/g, " ")}</Badge>
            <Badge>{course.course_type.replace(/_/g, " ")}</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight animate-fade-in-up sm:text-4xl" style={{ animationDelay: "60ms" }}>
            {course.title}
          </h1>
          {course.subtitle && (
            <p className="mt-3 text-lg text-muted animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              {course.subtitle}
            </p>
          )}
          {coach && (
            <p className="mt-3 text-sm text-muted animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              Taught by <span className="font-medium text-foreground">{coach.profiles?.display_name ?? coach.slug}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-4 pb-24 sm:px-6 lg:max-w-5xl lg:grid-cols-[1fr_320px]">
        <div>
          {course.description && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{course.description}</p>}

          <h2 className="mb-4 mt-10 text-lg font-semibold">Curriculum</h2>
          <p className="mb-4 -mt-2 text-xs text-muted">
            {modules?.length ?? 0} modules &middot; {lessonCount} lessons
          </p>
          <div className="space-y-3">
            {(modules ?? []).map((m, i) => (
              <Card key={m.id} hoverable className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                <h3 className="font-medium">{m.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {(m.lessons ?? []).map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <span aria-hidden>{lessonTypeIcon[l.lesson_type] ?? "•"}</span>
                      <span>{l.title}</span>
                      {!l.is_required && <span className="text-xs text-muted">(optional)</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="animate-scale-in">
            <p className="text-2xl font-semibold">{course.pricing_model === "free" ? "Free" : "Paid"}</p>
            <p className="mb-4 text-sm text-muted">Lifetime access to this course.</p>
            <EnrollButton courseId={course.id} courseHref={`/learn/course/${course.id}`} />
          </Card>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
