import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from "@/lib/domains/identity/permissions";
import { recomputeProgress } from "@/lib/domains/learning/progression";
import { writeAuditLog } from "@/lib/domains/system/audit";

/**
 * Student enrolls in a course. P0 supports the 'free' and 'admin_grant' sources only —
 * 'purchase' is reserved for the P1 checkout flow (docs/nexskill-roadmap.md). A free course
 * can be self-enrolled; a paid course in P0 has no working checkout, so it's rejected with a
 * clear error rather than silently granting access (§73: never fake a feature as working).
 */
export async function enrollStudent(supabase: TypedSupabaseClient, studentId: string, courseId: string) {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, status, pricing_model, published_version_id, access_duration_days")
    .eq("id", courseId)
    .single();
  if (courseError || !course) throw new NotFoundError("Course not found.");
  if (course.status !== "published") throw new InvalidStateTransitionError("This course is not open for enrollment.");
  if (course.pricing_model === "paid") {
    throw new ValidationError("Paid checkout is not available yet in this build. This course requires payment (P1).");
  }

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existing) throw new InvalidStateTransitionError("You are already enrolled in this course.");

  const expiresAt = course.access_duration_days
    ? new Date(Date.now() + course.access_duration_days * 86_400_000).toISOString()
    : null;

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({
      student_id: studentId,
      course_id: courseId,
      course_version_id: course.published_version_id,
      enrollment_source: "free",
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw error;

  await recomputeProgress(enrollment.id);
  await writeAuditLog(supabase, { actorId: studentId, action: "enrollment.created", targetType: "enrollments", targetId: enrollment.id });

  return enrollment;
}

/** Admin/coach grants free access without the student going through self-enroll (§42 enrollment_source='admin_grant'). */
export async function adminGrantEnrollment(
  supabase: TypedSupabaseClient,
  actorId: string,
  studentId: string,
  courseId: string
) {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, status, published_version_id")
    .eq("id", courseId)
    .single();
  if (courseError || !course) throw new NotFoundError("Course not found.");

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existing) throw new InvalidStateTransitionError("Student is already enrolled in this course.");

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({
      student_id: studentId,
      course_id: courseId,
      course_version_id: course.published_version_id,
      enrollment_source: "admin_grant",
    })
    .select()
    .single();
  if (error) throw error;

  await recomputeProgress(enrollment.id);
  await writeAuditLog(supabase, {
    actorId,
    action: "enrollment.admin_granted",
    targetType: "enrollments",
    targetId: enrollment.id,
    newState: { student_id: studentId, course_id: courseId },
  });
  return enrollment;
}

/**
 * Marks a non-assignment lesson complete for the caller's own enrollment. Enforces that the
 * lesson's module is actually unlocked — a student cannot complete a locked lesson by hitting
 * the API directly with its ID (§102).
 */
export async function completeLesson(supabase: TypedSupabaseClient, studentId: string, lessonId: string) {
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, lesson_type")
    .eq("id", lessonId)
    .single();
  if (lessonError || !lesson) throw new NotFoundError("Lesson not found.");

  if (lesson.lesson_type === "practical_assignment") {
    throw new InvalidStateTransitionError(
      "This lesson completes automatically once your assignment submission is passed by the coach."
    );
  }

  const { data: courseModule } = await supabase.from("course_modules").select("id, course_id").eq("id", lesson.module_id).single();
  if (!courseModule) throw new NotFoundError("Module not found.");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("course_id", courseModule.course_id)
    .eq("status", "active")
    .maybeSingle();
  if (!enrollment) throw new ForbiddenError("You are not actively enrolled in this course.");

  const { data: moduleProgress } = await supabase
    .from("module_progress")
    .select("status")
    .eq("enrollment_id", enrollment.id)
    .eq("module_id", courseModule.id)
    .maybeSingle();
  if (!moduleProgress || moduleProgress.status === "locked") {
    throw new ForbiddenError("This module is locked.");
  }

  const { data: existingProgress } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (existingProgress) {
    await supabase.from("lesson_progress").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", existingProgress.id);
  } else {
    await supabase
      .from("lesson_progress")
      .insert({ enrollment_id: enrollment.id, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString() });
  }

  await recomputeProgress(enrollment.id);

  return { enrollmentId: enrollment.id };
}
