import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RevokeCertificateButton } from "@/components/coach/RevokeCertificateButton";

export default async function AdminCertificatesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) redirect("/learn");

  const { data: certificates } = await supabase
    .from("certificates")
    .select("id, certificate_number, status, issued_at, courses(title), profiles!student_id(display_name)")
    .order("issued_at", { ascending: false })
    .limit(50)
    .returns<
      Array<{
        id: string;
        certificate_number: string;
        status: string;
        issued_at: string;
        courses: { title: string } | null;
        profiles: { display_name: string } | null;
      }>
    >();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Certificates</h1>
      <div className="space-y-2">
        {(certificates ?? []).map((c) => {
          const course = c.courses as unknown as { title: string } | null;
          const student = c.profiles as unknown as { display_name: string } | null;
          return (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{course?.title}</p>
                <p className="text-xs text-muted">
                  {student?.display_name} · <span className="font-mono">{c.certificate_number}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={c.status === "issued" ? "success" : c.status === "revoked" ? "error" : "warning"}>{c.status}</Badge>
                {c.status === "issued" && <RevokeCertificateButton certificateId={c.id} />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
