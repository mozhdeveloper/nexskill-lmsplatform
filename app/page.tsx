import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CourseGrid, type CourseCardData } from "@/components/marketing/CourseGrid";
import { CtaBanner } from "@/components/marketing/CtaBanner";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, subtitle, slug, level, pricing_model, coach_profiles(slug, headline)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return (
    <>
      <SiteHeader />
      <Hero />
      <HowItWorks />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Explore courses</h2>
            <p className="mt-1 text-sm text-muted">Published, ready to learn today.</p>
          </div>
        </div>
        <CourseGrid courses={(courses ?? []) as unknown as CourseCardData[]} />
      </section>

      <CtaBanner />
      <SiteFooter />
    </>
  );
}
