import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { CreateUserForm } from "@/components/coach/CreateUserForm";

export default async function NewUserPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold">Create account</h1>
      <p className="mb-8 text-sm text-muted">
        Directly create an account with a specific role — the only way to mint staff accounts
        (support, finance, moderator, admin) without going through self-registration.
      </p>
      <Card>
        <CreateUserForm />
      </Card>
    </div>
  );
}
