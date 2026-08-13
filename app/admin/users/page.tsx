import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SuspendUserButton } from "@/components/coach/SuspendUserButton";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  let query = supabase.from("profiles").select("id, display_name, status, country").order("created_at", { ascending: false }).limit(50);
  if (searchParams.q) {
    query = query.ilike("display_name", `%${searchParams.q}%`);
  }
  const { data: users } = await query;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Users</h1>
      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name..."
          className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </form>
      <div className="space-y-2">
        {(users ?? []).map((u) => (
          <Card key={u.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{u.display_name}</p>
              <p className="text-xs text-muted">{u.country}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={u.status === "active" ? "success" : "error"}>{u.status}</Badge>
              {u.id !== user.id && <SuspendUserButton userId={u.id} status={u.status} />}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
