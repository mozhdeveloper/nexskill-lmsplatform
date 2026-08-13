import type { ProgressionRuleType } from "@/types/database";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { issueCertificateIfEligible } from "@/lib/domains/certification/certificates";
import { evaluateRule } from "@/lib/domains/learning/progression-rules";

/**
 * Recomputes module lock state, course percent, and completion for one enrollment.
 * Call after: a lesson is marked complete, or a submission decision is recorded.
 * This is the single source of truth for "what can this student access right now" —
 * nothing in the UI or API sets module_progress directly.
 *
 * Uses the service-role client deliberately: this function can be triggered either by the
 * student (completing a lesson in their own enrollment) or by a coach/sub-coach (passing a
 * submission on a student's enrollment they don't own). Both call sites have already performed
 * their own permission check before calling in; this recompute step is derived system state,
 * not a direct user-authored write, so it isn't re-gated by per-row RLS ownership.
 */
export async function recomputeProgress(enrollmentId: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, course_id, status")
    .eq("id", enrollmentId)
    .single();
  if (enrollmentError || !enrollment) throw enrollmentError ?? new Error("Enrollment not found");

  const { data: course } = await supabase.from("courses").select("id, completion_rules").eq("id", enrollment.course_id).single();
  if (!course) throw new Error("Course not found for enrollment");

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, position, lessons(id, is_required, assignment_id, lesson_type)")
    .eq("course_id", enrollment.course_id)
    .order("position");
  const orderedModules = modules ?? [];

  const { data: rules } = await supabase
    .from("progression_rules")
    .select("target_type, target_id, rule_type, config")
    .eq("course_id", enrollment.course_id)
    .eq("target_type", "module");
  const ruleByModuleId = new Map((rules ?? []).map((r) => [r.target_id, r]));

  const { data: lessonProgressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("enrollment_id", enrollmentId);
  const completedLessonIds = new Set((lessonProgressRows ?? []).filter((r) => r.status === "completed").map((r) => r.lesson_id));

  const { data: passedSubmissions } = await supabase
    .from("submissions")
    .select("assignment_id")
    .eq("enrollment_id", enrollmentId)
    .eq("status", "passed");
  const passedAssignmentIds = new Set((passedSubmissions ?? []).map((s) => s.assignment_id));

  const { data: allAssignments } = await supabase.from("assignments").select("id").eq("course_id", enrollment.course_id);
  const allAssignmentIds = (allAssignments ?? []).map((a) => a.id);

  let previousModuleCompleted = true; // module[0] has no predecessor, so 'sequential' defaults open for it
  let totalRequiredLessons = 0;
  let completedRequiredLessons = 0;

  for (const courseModule of orderedModules) {
    const lessons = (courseModule as { lessons: { id: string; is_required: boolean; assignment_id: string | null; lesson_type: string }[] }).lessons ?? [];
    const requiredLessons = lessons.filter((l) => l.is_required);
    totalRequiredLessons += requiredLessons.length;
    const moduleCompletedLessons = requiredLessons.filter((l) => completedLessonIds.has(l.id));
    completedRequiredLessons += moduleCompletedLessons.length;
    const moduleCompleted = requiredLessons.length > 0 && moduleCompletedLessons.length === requiredLessons.length;

    const rule = ruleByModuleId.get(courseModule.id);
    const ruleType: ProgressionRuleType = (rule?.rule_type as ProgressionRuleType) ?? "sequential";
    const config = (rule?.config as Record<string, unknown>) ?? {};

    const unlocked = evaluateRule(ruleType, config, {
      previousModuleCompleted,
      now: new Date(),
      passedAssignmentIds,
    });

    const status: "locked" | "unlocked" | "completed" = moduleCompleted ? "completed" : unlocked ? "unlocked" : "locked";

    const { data: existing } = await supabase
      .from("module_progress")
      .select("id, status")
      .eq("enrollment_id", enrollmentId)
      .eq("module_id", courseModule.id)
      .maybeSingle();

    if (existing) {
      if (existing.status !== status) {
        await supabase
          .from("module_progress")
          .update({
            status,
            unlocked_at: status !== "locked" && existing.status === "locked" ? new Date().toISOString() : undefined,
            completed_at: status === "completed" ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("module_progress").insert({
        enrollment_id: enrollmentId,
        module_id: courseModule.id,
        status,
        unlocked_at: status !== "locked" ? new Date().toISOString() : null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      });
    }

    previousModuleCompleted = moduleCompleted;
  }

  const percent = totalRequiredLessons > 0 ? Math.round((completedRequiredLessons / totalRequiredLessons) * 10000) / 100 : 0;

  const rulesSnapshot = course.completion_rules as { require_all_required_lessons: boolean; require_all_required_assignments_passed: boolean };
  const lessonsRuleMet = !rulesSnapshot.require_all_required_lessons || completedRequiredLessons === totalRequiredLessons;
  const assignmentsRuleMet =
    !rulesSnapshot.require_all_required_assignments_passed || allAssignmentIds.every((id) => passedAssignmentIds.has(id));
  const isComplete = lessonsRuleMet && assignmentsRuleMet && totalRequiredLessons > 0;

  const { data: existingProgress } = await supabase.from("course_progress").select("id").eq("enrollment_id", enrollmentId).maybeSingle();
  if (existingProgress) {
    await supabase
      .from("course_progress")
      .update({ percent, completed_at: isComplete ? new Date().toISOString() : null })
      .eq("id", existingProgress.id);
  } else {
    await supabase.from("course_progress").insert({
      enrollment_id: enrollmentId,
      percent,
      completion_rule_snapshot: rulesSnapshot,
      completed_at: isComplete ? new Date().toISOString() : null,
    });
  }

  if (isComplete && enrollment.status !== "completed") {
    await supabase.from("enrollments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", enrollmentId);
    await issueCertificateIfEligible(supabase, enrollmentId);
  }
}
