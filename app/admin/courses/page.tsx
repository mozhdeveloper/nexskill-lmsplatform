import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminCoursesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status, coach_profiles(slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">All courses</h1>
      <div className="space-y-2">
        {(courses ?? []).map((c) => {
          const coach = c.coach_profiles as unknown as { slug: string } | null;
          return (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted">{coach?.slug}</p>
              </div>
              <Badge>{c.status.replace(/_/g, " ")}</Badge>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
