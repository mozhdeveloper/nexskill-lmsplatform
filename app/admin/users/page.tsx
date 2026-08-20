import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SuspendUserButton } from "@/components/coach/SuspendUserButton";
import { UserRolesEditor } from "@/components/coach/UserRolesEditor";

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

  const userIds = (users ?? []).map((u) => u.id);
  const { data: roleRows } = userIds.length
    ? await supabase
        .from("user_roles")
        .select("user_id, roles(key)")
        .in("user_id", userIds)
        .returns<Array<{ user_id: string; roles: { key: string } | null }>>()
    : { data: [] };

  const rolesByUserId = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    if (!row.roles) continue;
    const existing = rolesByUserId.get(row.user_id) ?? [];
    existing.push(row.roles.key);
    rolesByUserId.set(row.user_id, existing);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link href="/admin/users/new">
          <Button>New user</Button>
        </Link>
      </div>
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
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[10rem]">
              <p className="font-medium">{u.display_name}</p>
              <p className="text-xs text-muted">{u.country}</p>
            </div>
            <UserRolesEditor userId={u.id} currentRoles={rolesByUserId.get(u.id) ?? []} />
            <div className="flex items-center gap-3">
              <Badge tone={u.status === "active" ? "success" : "error"}>{u.status}</Badge>
              {u.id !== user.id && <SuspendUserButton userId={u.id} status={u.status} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
