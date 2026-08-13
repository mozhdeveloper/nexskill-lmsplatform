import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function CertificateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: certificate } = await supabase
    .from("certificates")
    .select("id, certificate_number, status, issued_at, student_id, courses(title)")
    .eq("id", params.id)
    .single();

  if (!certificate || certificate.student_id !== user.id) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <p className="text-error">Certificate not found.</p>
        </Card>
      </main>
    );
  }

  const course = certificate.courses as unknown as { title: string } | null;
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify/${certificate.certificate_number}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <Badge tone="success">Issued</Badge>
        <h1 className="mt-3 text-xl font-semibold">{course?.title}</h1>
        <p className="mt-1 font-mono text-sm text-muted">{certificate.certificate_number}</p>
        <p className="mt-1 text-sm text-muted">Issued {new Date(certificate.issued_at).toLocaleDateString()}</p>
        <p className="mt-6 text-sm">
          Public verification link:{" "}
          <Link href={`/verify/${certificate.certificate_number}`} className="text-primary underline">
            {verifyUrl}
          </Link>
        </p>
      </Card>
    </main>
  );
}
