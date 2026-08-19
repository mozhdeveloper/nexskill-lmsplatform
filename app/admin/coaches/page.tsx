import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminCoachApplicationsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: applications } = await supabase
    .from("coach_applications")
    .select("id, public_name, country, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Coach applications</h1>
      <div className="space-y-2">
        {(applications ?? []).map((a) => (
          <Link key={a.id} href={`/admin/coaches/${a.id}`}>
            <Card className="flex items-center justify-between hover:border-primary">
              <div>
                <p className="font-medium">{a.public_name}</p>
                <p className="text-xs text-muted">{a.country}</p>
              </div>
              <Badge tone={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}>
                {a.status.replace(/_/g, " ")}
              </Badge>
            </Card>
          </Link>
        ))}
        {(!applications || applications.length === 0) && (
          <Card>
            <p className="text-sm text-muted">No applications yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
