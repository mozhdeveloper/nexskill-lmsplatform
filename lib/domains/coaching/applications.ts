import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
  hasPermission,
} from "@/lib/domains/identity/permissions";
import { writeAuditLog } from "@/lib/domains/system/audit";

export const submitApplicationSchema = z.object({
  publicName: z.string().min(2).max(120),
  legalName: z.string().min(2).max(160),
  country: z.string().min(2).max(80),
  bio: z.string().min(50).max(4000),
  expertise: z.array(z.string().min(1)).min(1).max(20),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  qualifications: z.string().max(4000).optional(),
  portfolioUrl: z.string().url().optional(),
  socialLinks: z.record(z.string().url()).optional(),
  proposedCategories: z.array(z.string()).min(1).max(10),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

/** Student submits (or re-submits) a coach application (§8). */
export async function submitCoachApplication(
  supabase: TypedSupabaseClient,
  applicantId: string,
  input: SubmitApplicationInput
) {
  const parsed = submitApplicationSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const v = parsed.data;

  const { data: existing } = await supabase
    .from("coach_applications")
    .select("id, status")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && !["draft", "additional_information_required", "rejected"].includes(existing.status)) {
    throw new InvalidStateTransitionError(
      `An application already exists with status "${existing.status}" and cannot be resubmitted.`
    );
  }

  const { data, error } = await supabase
    .from("coach_applications")
    .insert({
      applicant_id: applicantId,
      public_name: v.publicName,
      legal_name: v.legalName,
      country: v.country,
      bio: v.bio,
      expertise: v.expertise,
      years_experience: v.yearsExperience ?? null,
      qualifications: v.qualifications ?? null,
      portfolio_url: v.portfolioUrl ?? null,
      social_links: v.socialLinks ?? {},
      proposed_categories: v.proposedCategories,
      status: "submitted",
    })
    .select()
    .single();

  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: applicantId,
    action: "coach_application.submitted",
    targetType: "coach_applications",
    targetId: data.id,
  });

  return data;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "coach"
  );
}

/**
 * Admin approves a coach application. Creates the coach_profiles row — this is the ONLY
 * path by which a coach_profiles row comes into existence (§8: "Once approved, Coach Studio
 * becomes available").
 */
export async function approveCoachApplication(
  supabase: TypedSupabaseClient,
  adminId: string,
  applicationId: string,
  reviewNotes?: string
) {
  if (!(await hasPermission(supabase, adminId, "coach.review"))) {
    throw new ForbiddenError("Only an admin with coach.review permission can approve applications.");
  }

  const { data: application, error: fetchError } = await supabase
    .from("coach_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (fetchError || !application) throw new NotFoundError("Coach application not found.");

  if (!["submitted", "under_review", "additional_information_required"].includes(application.status)) {
    throw new InvalidStateTransitionError(`Cannot approve an application with status "${application.status}".`);
  }

  const baseSlug = slugify(application.public_name);
  let slug = baseSlug;
  let suffix = 1;
  // Ensure slug uniqueness without leaking existing slugs to the caller.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: clash } = await supabase.from("coach_profiles").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const { data: coachProfile, error: insertError } = await supabase
    .from("coach_profiles")
    .insert({
      user_id: application.applicant_id,
      application_id: application.id,
      slug,
      headline: null,
      verified: false,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const { data: coachRole } = await supabase.from("roles").select("id").eq("key", "coach").single();
  if (coachRole) {
    await supabase.from("user_roles").insert({ user_id: application.applicant_id, role_id: coachRole.id });
  }

  const { error: updateError } = await supabase
    .from("coach_applications")
    .update({ status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString(), review_notes: reviewNotes ?? null })
    .eq("id", applicationId);
  if (updateError) throw updateError;

  await writeAuditLog(supabase, {
    actorId: adminId,
    action: "coach_application.approved",
    targetType: "coach_applications",
    targetId: applicationId,
    previousState: { status: application.status },
    newState: { status: "approved", coach_profile_id: coachProfile.id },
  });

  return coachProfile;
}

export async function rejectCoachApplication(
  supabase: TypedSupabaseClient,
  adminId: string,
  applicationId: string,
  reviewNotes: string
) {
  if (!(await hasPermission(supabase, adminId, "coach.review"))) {
    throw new ForbiddenError("Only an admin with coach.review permission can reject applications.");
  }
  if (!reviewNotes || reviewNotes.trim().length < 5) {
    throw new ValidationError("A reason is required when rejecting an application.");
  }

  const { data: application, error: fetchError } = await supabase
    .from("coach_applications")
    .select("id, status")
    .eq("id", applicationId)
    .single();
  if (fetchError || !application) throw new NotFoundError("Coach application not found.");

  if (!["submitted", "under_review", "additional_information_required"].includes(application.status)) {
    throw new InvalidStateTransitionError(`Cannot reject an application with status "${application.status}".`);
  }

  const { data, error } = await supabase
    .from("coach_applications")
    .update({ status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString(), review_notes: reviewNotes })
    .eq("id", applicationId)
    .select()
    .single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: adminId,
    action: "coach_application.rejected",
    targetType: "coach_applications",
    targetId: applicationId,
    previousState: { status: application.status },
    newState: { status: "rejected" },
  });

  return data;
}
