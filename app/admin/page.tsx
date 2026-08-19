import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";

export default async function AdminOverviewPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { count: pendingApplications } = await supabase
    .from("coach_applications")
    .select("id", { count: "exact", head: true })
    .in("status", ["submitted", "under_review"]);

  const { count: pendingCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted_for_review");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Admin</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/coaches">
          <Card className="hover:border-primary">
            <p className="text-sm text-muted">Pending coach applications</p>
            <p className="mt-1 text-3xl font-semibold">{pendingApplications ?? 0}</p>
          </Card>
        </Link>
        <Link href="/admin/courses">
          <Card className="hover:border-primary">
            <p className="text-sm text-muted">Courses awaiting review</p>
            <p className="mt-1 text-3xl font-semibold">{pendingCourses ?? 0}</p>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="hover:border-primary">
            <p className="text-sm font-medium">User management →</p>
          </Card>
        </Link>
        <Link href="/admin/certificates">
          <Card className="hover:border-primary">
            <p className="text-sm font-medium">Certificates →</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
