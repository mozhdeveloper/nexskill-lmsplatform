import { z } from "zod";
import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
  hasCoursePermission,
} from "@/lib/domains/identity/permissions";
import { recomputeProgress } from "@/lib/domains/learning/progression";
import { writeAuditLog } from "@/lib/domains/system/audit";
import { createSupabaseServiceRoleClient, type TypedSupabaseClient } from "@/lib/supabase/server";

const createSubmissionSchema = z.object({
  files: z
    .array(
      z.object({
        mediaId: z.string().uuid(),
        submissionType: z.enum(["photo", "video", "pdf", "document", "text", "audio"]),
      })
    )
    .min(1),
});

/**
 * Student creates and immediately submits a new attempt. Every attempt is a new row — a
 * resubmission never overwrites a prior one, so the full history is preserved for the coach
 * and for audit purposes (§13).
 */
export async function createSubmission(
  supabase: TypedSupabaseClient,
  studentId: string,
  assignmentId: string,
  input: z.infer<typeof createSubmissionSchema>
) {
  const parsed = createSubmissionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, course_id, max_attempts, required_submission_types")
    .eq("id", assignmentId)
    .single();
  if (assignmentError || !assignment) throw new NotFoundError("Assignment not found.");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", assignment.course_id)
    .eq("status", "active")
    .maybeSingle();
  if (!enrollment) throw new ForbiddenError("You are not actively enrolled in this course.");

  const submittedTypes = new Set(parsed.data.files.map((f) => f.submissionType));
  const missingRequired = assignment.required_submission_types.filter((t) => !submittedTypes.has(t as never));
  if (missingRequired.length > 0) {
    throw new ValidationError(`This assignment requires: ${missingRequired.join(", ")}.`);
  }

  const { data: priorAttempts } = await supabase
    .from("submissions")
    .select("attempt_number, status")
    .eq("assignment_id", assignmentId)
    .eq("enrollment_id", enrollment.id)
    .order("attempt_number", { ascending: false });

  const latest = priorAttempts?.[0];
  if (latest && ["draft", "submitted", "in_review", "passed"].includes(latest.status)) {
    throw new InvalidStateTransitionError(
      latest.status === "passed"
        ? "This assignment has already been passed."
        : "You already have a submission awaiting review. Wait for feedback before submitting again."
    );
  }

  const attemptNumber = (priorAttempts?.length ?? 0) + 1;
  if (assignment.max_attempts && attemptNumber > assignment.max_attempts) {
    throw new InvalidStateTransitionError(`Maximum attempts (${assignment.max_attempts}) reached for this assignment.`);
  }

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      enrollment_id: enrollment.id,
      student_id: studentId,
      attempt_number: attemptNumber,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  const fileRows = parsed.data.files.map((f) => ({
    submission_id: submission.id,
    media_id: f.mediaId,
    submission_type: f.submissionType,
  }));
  const { error: filesError } = await supabase.from("submission_files").insert(fileRows);
  if (filesError) throw filesError;

  await writeAuditLog(supabase, {
    actorId: studentId,
    action: "submission.submitted",
    targetType: "submissions",
    targetId: submission.id,
    newState: { attempt_number: attemptNumber },
  });

  return submission;
}

async function loadSubmissionForReview(supabase: TypedSupabaseClient, reviewerId: string, submissionId: string) {
  const { data: submission, error } = await supabase.from("submissions").select("*").eq("id", submissionId).single();
  if (error || !submission) throw new NotFoundError("Submission not found.");

  const { data: assignment } = await supabase.from("assignments").select("course_id, lesson_id").eq("id", submission.assignment_id).single();
  if (!assignment) throw new NotFoundError("Assignment not found.");

  if (!(await hasCoursePermission(supabase, reviewerId, assignment.course_id, "submission.review"))) {
    throw new ForbiddenError("You cannot review submissions for this course.");
  }

  if (!["submitted", "in_review"].includes(submission.status)) {
    throw new InvalidStateTransitionError(`Cannot record a decision on a submission with status "${submission.status}".`);
  }

  return { submission, assignment };
}

const decisionSchema = z.object({
  writtenFeedback: z.string().max(8000).optional(),
  rubricScores: z.record(z.number()).optional(),
});

/** Coach/sub-coach requests revision. Original submission is preserved; student creates a new attempt to respond. */
export async function requestRevision(
  supabase: TypedSupabaseClient,
  reviewerId: string,
  submissionId: string,
  input: z.infer<typeof decisionSchema>
) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  if (!parsed.data.writtenFeedback || parsed.data.writtenFeedback.trim().length < 5) {
    throw new ValidationError("Feedback is required when requesting a revision.");
  }

  const { submission } = await loadSubmissionForReview(supabase, reviewerId, submissionId);

  await supabase.from("submission_reviews").insert({
    submission_id: submissionId,
    reviewer_id: reviewerId,
    decision: "revision_required",
    written_feedback: parsed.data.writtenFeedback,
    rubric_scores: parsed.data.rubricScores ?? {},
  });

  const { data, error } = await supabase.from("submissions").update({ status: "revision_required" }).eq("id", submissionId).select().single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: reviewerId,
    action: "submission.revision_requested",
    targetType: "submissions",
    targetId: submissionId,
    previousState: { status: submission.status },
    newState: { status: "revision_required" },
  });

  return data;
}

/** Coach/sub-coach passes the submission — auto-completes the linked lesson (if any) and recomputes progression/course unlock. */
export async function passSubmission(
  supabase: TypedSupabaseClient,
  reviewerId: string,
  submissionId: string,
  input: z.infer<typeof decisionSchema>
) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  const { submission, assignment } = await loadSubmissionForReview(supabase, reviewerId, submissionId);

  await supabase.from("submission_reviews").insert({
    submission_id: submissionId,
    reviewer_id: reviewerId,
    decision: "passed",
    written_feedback: parsed.data.writtenFeedback ?? null,
    rubric_scores: parsed.data.rubricScores ?? {},
  });

  const { data, error } = await supabase.from("submissions").update({ status: "passed" }).eq("id", submissionId).select().single();
  if (error) throw error;

  if (assignment.lesson_id) {
    const { data: existingProgress } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("enrollment_id", submission.enrollment_id)
      .eq("lesson_id", assignment.lesson_id)
      .maybeSingle();
    if (existingProgress) {
      await supabase.from("lesson_progress").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", existingProgress.id);
    } else {
      await supabase.from("lesson_progress").insert({
        enrollment_id: submission.enrollment_id,
        lesson_id: assignment.lesson_id,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }
  }

  await recomputeProgress(submission.enrollment_id);

  await writeAuditLog(supabase, {
    actorId: reviewerId,
    action: "submission.passed",
    targetType: "submissions",
    targetId: submissionId,
    previousState: { status: submission.status },
    newState: { status: "passed" },
  });

  return data;
}

export async function failSubmission(
  supabase: TypedSupabaseClient,
  reviewerId: string,
  submissionId: string,
  input: z.infer<typeof decisionSchema>
) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  if (!parsed.data.writtenFeedback || parsed.data.writtenFeedback.trim().length < 5) {
    throw new ValidationError("Feedback is required when failing a submission.");
  }

  const { submission } = await loadSubmissionForReview(supabase, reviewerId, submissionId);

  await supabase.from("submission_reviews").insert({
    submission_id: submissionId,
    reviewer_id: reviewerId,
    decision: "failed",
    written_feedback: parsed.data.writtenFeedback,
    rubric_scores: parsed.data.rubricScores ?? {},
  });

  const { data, error } = await supabase.from("submissions").update({ status: "failed" }).eq("id", submissionId).select().single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: reviewerId,
    action: "submission.failed",
    targetType: "submissions",
    targetId: submissionId,
    previousState: { status: submission.status },
    newState: { status: "failed" },
  });

  return data;
}

/** Review queue: everything awaiting this reviewer's attention across courses they can review. */
export async function getReviewQueue(supabase: TypedSupabaseClient, reviewerId: string) {
  // Courses the reviewer owns directly.
  const { data: ownedCourses } = await supabase
    .from("courses")
    .select("id, title, coach_profiles!inner(user_id)")
    .eq("coach_profiles.user_id", reviewerId);

  // Courses granted via scoped sub-coach access with submission.review.
  const { data: teamGrants } = await supabase
    .from("coach_team_members")
    .select("scope_type, scope_id")
    .eq("member_id", reviewerId)
    .eq("status", "active")
    .contains("permission_keys", ["submission.review"]);

  const scopedCourseIds = (teamGrants ?? []).filter((g) => g.scope_type === "course" && g.scope_id).map((g) => g.scope_id as string);
  const ownedCourseIds = (ownedCourses ?? []).map((c) => c.id);
  const courseIds = Array.from(new Set([...ownedCourseIds, ...scopedCourseIds]));

  if (courseIds.length === 0) return [];

  const { data: assignments } = await supabase.from("assignments").select("id, course_id, title").in("course_id", courseIds);
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  if (assignmentIds.length === 0) return [];

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, assignment_id, enrollment_id, student_id, attempt_number, status, submitted_at")
    .in("assignment_id", assignmentIds)
    .in("status", ["submitted", "in_review"])
    .order("submitted_at", { ascending: true });

  const assignmentById = new Map((assignments ?? []).map((a) => [a.id, a]));
  return (submissions ?? []).map((s) => ({
    ...s,
    assignmentTitle: assignmentById.get(s.assignment_id)?.title ?? "Assignment",
    courseId: assignmentById.get(s.assignment_id)?.course_id,
  }));
}

/**
 * Loads a submission plus signed URLs for its files, for the review detail page. Storage RLS
 * (migration 0007) only lets the *student* read their own submissions folder directly, so a
 * reviewing coach/sub-coach cannot generate a signed URL through their own session — this
 * function re-verifies the caller's course permission first, then uses the service-role client
 * only to mint the short-lived signed URLs. The permission check, not the storage grant, is
 * what's doing the authorization work here.
 */
export async function getSubmissionForReview(supabase: TypedSupabaseClient, actorId: string, submissionId: string) {
  const { data: submission, error } = await supabase.from("submissions").select("*").eq("id", submissionId).single();
  if (error || !submission) throw new NotFoundError("Submission not found.");

  const { data: assignment } = await supabase.from("assignments").select("*").eq("id", submission.assignment_id).single();
  if (!assignment) throw new NotFoundError("Assignment not found.");

  const isOwner = submission.student_id === actorId;
  const canReview = await hasCoursePermission(supabase, actorId, assignment.course_id, "submission.review");
  if (!isOwner && !canReview) throw new ForbiddenError("You cannot view this submission.");

  const { data: files } = await supabase.from("submission_files").select("*, media_assets(storage_bucket, storage_path, title)").eq("submission_id", submissionId);

  const service = createSupabaseServiceRoleClient();
  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (f) => {
      const media = (f as unknown as { media_assets: { storage_bucket: string; storage_path: string; title: string | null } }).media_assets;
      const { data: signed } = await service.storage.from(media.storage_bucket).createSignedUrl(media.storage_path, 300);
      return { id: f.id, submissionType: f.submission_type, title: media.title, url: signed?.signedUrl ?? null };
    })
  );

  const { data: reviews } = await supabase
    .from("submission_reviews")
    .select("*")
    .eq("submission_id", submissionId)
    .order("reviewed_at", { ascending: false });

  return { submission, assignment, files: filesWithUrls, reviews: reviews ?? [], canReview };
}
