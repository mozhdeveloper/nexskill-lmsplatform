import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { InvalidStateTransitionError, NotFoundError, ValidationError } from "@/lib/domains/identity/permissions";
import { writeAuditLog } from "@/lib/domains/system/audit";
import { anchorCertificate } from "@/lib/integrations/certificate-anchor";

function randomCode(length: number): string {
  return randomBytes(length).toString("hex").toUpperCase().slice(0, length);
}

function buildCertificateNumber(categorySlug: string): string {
  const year = new Date().getUTCFullYear();
  const category = categorySlug.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "GEN";
  return `NXS-${category}-${year}-${randomCode(6)}`;
}

/**
 * Called by the progression engine the moment an enrollment's completion rules are satisfied.
 * Issuance itself is synchronous and never blocked by blockchain anchoring (§104) — anchoring
 * is queued separately and can fail/retry without affecting the certificate's validity.
 * This function must only ever be invoked with a service-role/admin-privileged client, since
 * the certificates table has no student-facing insert policy (see migration 0005).
 */
export async function issueCertificateIfEligible(supabase: SupabaseClient<Database>, enrollmentId: string) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, student_id, course_id, status")
    .eq("id", enrollmentId)
    .single();
  if (enrollmentError || !enrollment) throw new NotFoundError("Enrollment not found.");
  if (enrollment.status !== "completed") return null;

  const { data: existing } = await supabase.from("certificates").select("id").eq("enrollment_id", enrollmentId).maybeSingle();
  if (existing) return existing;

  const { data: course } = await supabase
    .from("courses")
    .select("id, coach_profile_id, categories(slug)")
    .eq("id", enrollment.course_id)
    .single();
  if (!course) throw new NotFoundError("Course not found.");

  const categorySlug = (course as unknown as { categories: { slug: string } | null }).categories?.slug ?? "gen";
  let certificateNumber = buildCertificateNumber(categorySlug);
  // Extremely unlikely collision given the random suffix, but guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from("certificates").select("id").eq("certificate_number", certificateNumber).maybeSingle();
    if (!clash) break;
    certificateNumber = buildCertificateNumber(categorySlug);
  }

  const issuedAt = new Date().toISOString();
  const payload = {
    certificateNumber,
    enrollmentId,
    studentId: enrollment.student_id,
    courseId: enrollment.course_id,
    coachProfileId: course.coach_profile_id,
    issuedAt,
  };
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  const { data: certificate, error } = await supabase
    .from("certificates")
    .insert({
      enrollment_id: enrollmentId,
      certificate_number: certificateNumber,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      coach_profile_id: course.coach_profile_id,
      issued_at: issuedAt,
      status: "issued",
      payload_hash: payloadHash,
    })
    .select()
    .single();
  if (error) throw error;

  const anchorResult = await anchorCertificate({ certificateId: certificate.id, payloadHash });
  await supabase.from("certificate_blockchain_records").insert({
    certificate_id: certificate.id,
    chain: anchorResult.chain,
    transaction_hash: anchorResult.transactionHash,
    block_reference: anchorResult.blockReference,
    anchored_at: anchorResult.anchoredAt,
    verification_status: anchorResult.verificationStatus,
  });

  await writeAuditLog(supabase, {
    actorId: null,
    action: "certificate.issued",
    targetType: "certificates",
    targetId: certificate.id,
    newState: { certificate_number: certificateNumber, enrollment_id: enrollmentId },
  });

  return certificate;
}

export async function revokeCertificate(
  supabase: SupabaseClient<Database>,
  adminId: string,
  certificateId: string,
  reason: string
) {
  if (!reason || reason.trim().length < 5) throw new ValidationError("A reason is required to revoke a certificate.");

  const { data: certificate, error } = await supabase.from("certificates").select("id, status").eq("id", certificateId).single();
  if (error || !certificate) throw new NotFoundError("Certificate not found.");
  if (certificate.status === "revoked") throw new InvalidStateTransitionError("Certificate is already revoked.");

  const { data, error: updateError } = await supabase
    .from("certificates")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: adminId, revoked_reason: reason })
    .eq("id", certificateId)
    .select()
    .single();
  if (updateError) throw updateError;

  await writeAuditLog(supabase, {
    actorId: adminId,
    action: "certificate.revoked",
    targetType: "certificates",
    targetId: certificateId,
    previousState: { status: certificate.status },
    newState: { status: "revoked", reason },
  });

  return data;
}

/** Public verification (§34, §104). Returns only non-sensitive fields — never legal name, email, payment info. */
export async function getPublicCertificate(supabase: SupabaseClient<Database>, certificateNumber: string) {
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select(
      // certificates has TWO foreign keys into profiles (student_id, revoked_by), so the
      // embed must disambiguate with !student_id — omitting the hint makes PostgREST reject
      // the query as ambiguous rather than guessing.
      "certificate_number, status, issued_at, expires_at, revoked_at, course_id, coach_profile_id, student_id, courses(title), coach_profiles(slug, headline), profiles!student_id(display_name), certificate_blockchain_records(chain, transaction_hash, verification_status, anchored_at)"
    )
    .eq("certificate_number", certificateNumber)
    .maybeSingle();
  if (error) throw error;
  if (!certificate) return null;

  type BlockchainRecord = { chain: string | null; transaction_hash: string | null; verification_status: string; anchored_at: string | null };
  const c = certificate as unknown as {
    certificate_number: string;
    status: string;
    issued_at: string;
    expires_at: string | null;
    revoked_at: string | null;
    courses: { title: string } | null;
    coach_profiles: { slug: string; headline: string | null } | null;
    profiles: { display_name: string } | null;
    // certificate_blockchain_records.certificate_id is unique, so PostgREST embeds it as a
    // single object — but this is normalized defensively in case a schema/client-library
    // change ever makes it come back as a one-element array instead.
    certificate_blockchain_records: BlockchainRecord | BlockchainRecord[] | null;
  };

  const blockchain = Array.isArray(c.certificate_blockchain_records)
    ? c.certificate_blockchain_records[0] ?? null
    : c.certificate_blockchain_records;

  return {
    certificateNumber: c.certificate_number,
    status: c.status,
    issuedAt: c.issued_at,
    expiresAt: c.expires_at,
    revokedAt: c.revoked_at,
    courseTitle: c.courses?.title ?? "Unknown course",
    coachSlug: c.coach_profiles?.slug ?? null,
    coachHeadline: c.coach_profiles?.headline ?? null,
    studentDisplayName: c.profiles?.display_name ?? "Unknown student",
    blockchain: blockchain
      ? {
          chain: blockchain.chain,
          transactionHash: blockchain.transaction_hash,
          verificationStatus: blockchain.verification_status,
          anchoredAt: blockchain.anchored_at,
        }
      : null,
  };
}
