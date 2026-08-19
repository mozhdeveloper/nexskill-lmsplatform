import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CoachApplicationDecision } from "@/components/coach/CoachApplicationDecision";

export default async function AdminCoachApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: application } = await supabase.from("coach_applications").select("*").eq("id", params.id).maybeSingle();
  if (!application) redirect("/admin/coaches");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{application.public_name}</h1>
        <Badge tone={application.status === "approved" ? "success" : application.status === "rejected" ? "error" : "warning"}>
          {application.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card className="mb-6">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Legal name</dt>
            <dd>{application.legal_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Country</dt>
            <dd>{application.country}</dd>
          </div>
          <div>
            <dt className="text-muted">Expertise</dt>
            <dd>{application.expertise.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Proposed categories</dt>
            <dd>{application.proposed_categories.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Bio</dt>
            <dd className="whitespace-pre-line">{application.bio}</dd>
          </div>
        </dl>
      </Card>

      {["submitted", "under_review", "additional_information_required"].includes(application.status) ? (
        <Card>
          <CoachApplicationDecision applicationId={application.id} />
        </Card>
      ) : (
        application.review_notes && (
          <Card>
            <p className="text-sm text-muted">Review notes: {application.review_notes}</p>
          </Card>
        )
      )}
    </div>
  );
}
