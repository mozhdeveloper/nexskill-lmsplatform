import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicCertificate } from "@/lib/domains/certification/certificates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default async function VerifyCertificatePage({ params }: { params: { certificateId: string } }) {
  const supabase = createSupabaseServerClient();
  const certificate = await getPublicCertificate(supabase, params.certificateId);

  return (
    <>
      <SiteHeader />
      <main className="bg-dot-grid">
        <div className="mx-auto max-w-xl px-4 py-20">
          <div className="mb-6 animate-fade-in-up text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Certificate verification</h1>
            <p className="mt-1 text-sm text-muted">Publicly checkable — no sign-in required.</p>
          </div>
          {!certificate ? (
            <Card className="animate-scale-in text-center">
              <p className="text-error">No certificate found with ID &quot;{params.certificateId}&quot;.</p>
            </Card>
          ) : (
            <Card className="animate-scale-in">
              <div className="mb-4">
                {certificate.status === "issued" && <Badge tone="success">Valid</Badge>}
                {certificate.status === "revoked" && <Badge tone="error">Revoked</Badge>}
                {certificate.status === "pending" && <Badge tone="warning">Pending</Badge>}
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted">Certificate ID</dt>
                  <dd className="font-mono">{certificate.certificateNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted">Course</dt>
                  <dd>{certificate.courseTitle}</dd>
                </div>
                <div>
                  <dt className="text-muted">Awarded to</dt>
                  <dd>{certificate.studentDisplayName}</dd>
                </div>
                <div>
                  <dt className="text-muted">Issued</dt>
                  <dd>{new Date(certificate.issuedAt).toLocaleDateString()}</dd>
                </div>
                {certificate.coachHeadline && (
                  <div>
                    <dt className="text-muted">Instructor</dt>
                    <dd>{certificate.coachHeadline}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Blockchain anchoring</dt>
                  <dd className="capitalize">{certificate.blockchain?.verificationStatus ?? "unanchored"}</dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
