import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CourseGrid, type CourseCardData } from "@/components/marketing/CourseGrid";

export default async function BrowseCoursesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, subtitle, slug, level, pricing_model, coach_profiles(slug, headline)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(48);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-muted">Browse everything published on NexSkill.</p>
      </div>
      <CourseGrid courses={(courses ?? []) as unknown as CourseCardData[]} />
    </div>
  );
}
