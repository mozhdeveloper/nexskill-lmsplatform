import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, subtitle, slug, level, pricing_model, coach_profiles(slug, headline)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Nexskill</p>
          <h1 className="mt-1 text-3xl font-semibold">Learn a Skill. Prove a Skill. Build Your Future.</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/become-a-coach" className="text-muted hover:text-foreground">
            Become a coach
          </Link>
          <Link href="/login" className="text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
            Get started
          </Link>
        </nav>
      </header>

      <h2 className="mb-4 text-lg font-semibold">Published courses</h2>
      {!courses || courses.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No published courses yet. Once an approved coach publishes a course, it will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.slug}`}>
              <Card className="h-full transition hover:border-primary">
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone={course.pricing_model === "free" ? "success" : "primary"}>
                    {course.pricing_model === "free" ? "Free" : "Paid"}
                  </Badge>
                  <Badge>{course.level}</Badge>
                </div>
                <h3 className="font-semibold">{course.title}</h3>
                {course.subtitle && <p className="mt-1 text-sm text-muted">{course.subtitle}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
