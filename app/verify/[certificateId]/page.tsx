import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicCertificate } from "@/lib/domains/certification/certificates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function VerifyCertificatePage({ params }: { params: { certificateId: string } }) {
  const supabase = createSupabaseServerClient();
  const certificate = await getPublicCertificate(supabase, params.certificateId);

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Certificate verification</h1>
      {!certificate ? (
        <Card>
          <p className="text-error">No certificate found with ID &quot;{params.certificateId}&quot;.</p>
        </Card>
      ) : (
        <Card>
          <div className="mb-4">
            {certificate.status === "issued" && <Badge tone="success">Valid</Badge>}
            {certificate.status === "revoked" && <Badge tone="error">Revoked</Badge>}
            {certificate.status === "pending" && <Badge tone="warning">Pending</Badge>}
          </div>
          <dl className="space-y-2 text-sm">
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
    </main>
  );
}
