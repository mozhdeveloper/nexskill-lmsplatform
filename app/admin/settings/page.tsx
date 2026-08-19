import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { SettingToggle } from "@/components/coach/SettingToggle";

export default async function AdminSettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: settings } = await supabase.from("platform_settings").select("key, value, category");
  const valueByKey = new Map((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Platform settings</h1>
      <Card>
        <SettingToggle
          settingKey="coach_approval_required"
          label="Require admin approval for coach applications"
          initialValue={Boolean(valueByKey.get("coach_approval_required") ?? true)}
        />
        <SettingToggle
          settingKey="course_publish_requires_admin_review"
          label="Require admin review before a course publishes"
          initialValue={Boolean(valueByKey.get("course_publish_requires_admin_review") ?? false)}
        />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Other settings (commission rate, access duration defaults) are stored in platform_settings and editable via
        this same pattern — see docs/database.md §2 System.
      </p>
    </div>
  );
}
