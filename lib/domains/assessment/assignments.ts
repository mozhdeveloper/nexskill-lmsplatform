import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ForbiddenError, ValidationError, hasCoursePermission } from "@/lib/domains/identity/permissions";

const createAssignmentSchema = z.object({
  title: z.string().min(3).max(160),
  instructions: z.string().min(10).max(8000),
  lessonId: z.string().uuid().optional(),
  requiredSubmissionTypes: z.array(z.enum(["photo", "video", "pdf", "document", "text", "audio"])).min(1).default(["text"]),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  dueAt: z.string().datetime().optional(),
  passingCriteria: z.object({ type: z.enum(["pass_fail", "rubric"]), minTotal: z.number().optional() }).default({ type: "pass_fail" }),
  rubricItems: z.array(z.object({ label: z.string().min(1), maxPoints: z.number().int().min(1) })).optional(),
});

/** Coach creates a practical assignment for their course (§13). */
export async function createAssignment(
  supabase: TypedSupabaseClient,
  userId: string,
  courseId: string,
  input: z.infer<typeof createAssignmentSchema>
) {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  if (!(await hasCoursePermission(supabase, userId, courseId, "course.edit"))) {
    throw new ForbiddenError("You cannot edit this course.");
  }

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      course_id: courseId,
      lesson_id: parsed.data.lessonId ?? null,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      required_submission_types: parsed.data.requiredSubmissionTypes,
      max_attempts: parsed.data.maxAttempts ?? null,
      due_at: parsed.data.dueAt ?? null,
      passing_criteria: parsed.data.passingCriteria.type === "rubric"
        ? { type: "rubric", min_total: parsed.data.passingCriteria.minTotal ?? 80 }
        : { type: "pass_fail" },
    })
    .select()
    .single();
  if (error) throw error;

  if (parsed.data.rubricItems && parsed.data.rubricItems.length > 0) {
    const rows = parsed.data.rubricItems.map((r, index) => ({
      assignment_id: assignment.id,
      label: r.label,
      max_points: r.maxPoints,
      position: index,
    }));
    const { error: rubricError } = await supabase.from("rubric_items").insert(rows);
    if (rubricError) throw rubricError;
  }

  // Link the assignment back onto its lesson if one was specified, so the classroom knows
  // this lesson is gated by a practical_assignment submission.
  if (parsed.data.lessonId) {
    await supabase.from("lessons").update({ assignment_id: assignment.id }).eq("id", parsed.data.lessonId);
  }

  return assignment;
}
