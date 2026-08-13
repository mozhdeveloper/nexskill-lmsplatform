import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database";
import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
  hasCoursePermission,
} from "@/lib/domains/identity/permissions";
import { writeAuditLog } from "@/lib/domains/system/audit";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createCourseSchema = z.object({
  title: z.string().min(4).max(140),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(8000).optional(),
  categoryId: z.string().uuid().optional(),
  level: z.enum(["beginner", "intermediate", "advanced", "all_levels"]).default("all_levels"),
  courseType: z
    .enum(["self_paced", "mentored", "live", "hybrid", "cohort", "certification", "private", "organization"])
    .default("mentored"),
});

/** Coach creates a draft course under their own coach_profile (§10). */
export async function createCourse(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: z.infer<typeof createCourseSchema>
) {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  const { data: coachProfile } = await supabase.from("coach_profiles").select("id, status").eq("user_id", userId).maybeSingle();
  if (!coachProfile || coachProfile.status !== "active") {
    throw new ForbiddenError("Only an approved, active coach may create a course.");
  }

  const baseSlug = slugify(parsed.data.title) || "course";
  let slug = baseSlug;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: clash } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      coach_profile_id: coachProfile.id,
      title: parsed.data.title,
      slug,
      subtitle: parsed.data.subtitle ?? null,
      description: parsed.data.description ?? null,
      category_id: parsed.data.categoryId ?? null,
      level: parsed.data.level,
      course_type: parsed.data.courseType,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;

  await writeAuditLog(supabase, { actorId: userId, action: "course.created", targetType: "courses", targetId: data.id });
  return data;
}

const addModuleSchema = z.object({ title: z.string().min(2).max(140), description: z.string().max(2000).optional() });

export async function addModule(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseId: string,
  input: z.infer<typeof addModuleSchema>
) {
  const parsed = addModuleSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  if (!(await hasCoursePermission(supabase, userId, courseId, "course.edit"))) {
    throw new ForbiddenError("You cannot edit this course.");
  }

  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { data, error } = await supabase
    .from("course_modules")
    .insert({ course_id: courseId, title: parsed.data.title, description: parsed.data.description ?? null, position: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

const addLessonSchema = z.object({
  title: z.string().min(2).max(140),
  lessonType: z.enum([
    "video",
    "rich_text",
    "image_gallery",
    "audio",
    "pdf",
    "file_download",
    "presentation",
    "external_resource",
    "quiz",
    "exam",
    "practical_assignment",
    "live_class",
    "discussion",
    "project",
    "checklist",
    "survey",
  ]),
  content: z.record(z.unknown()).default({}),
  assignmentId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(0).max(600).optional(),
  isRequired: z.boolean().default(true),
});

export async function addLesson(
  supabase: SupabaseClient<Database>,
  userId: string,
  moduleId: string,
  input: z.infer<typeof addLessonSchema>
) {
  const parsed = addLessonSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  const { data: courseModule } = await supabase.from("course_modules").select("id, course_id").eq("id", moduleId).maybeSingle();
  if (!courseModule) throw new NotFoundError("Module not found.");

  if (!(await hasCoursePermission(supabase, userId, courseModule.course_id, "course.edit"))) {
    throw new ForbiddenError("You cannot edit this course.");
  }

  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: parsed.data.title,
      lesson_type: parsed.data.lessonType,
      content: parsed.data.content,
      assignment_id: parsed.data.assignmentId ?? null,
      estimated_minutes: parsed.data.estimatedMinutes ?? null,
      is_required: parsed.data.isRequired,
      position: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

const setProgressionRuleSchema = z.object({
  targetType: z.enum(["module", "lesson"]),
  targetId: z.string().uuid(),
  ruleType: z.enum(["open", "sequential", "assignment_gated", "score_gated", "instructor_gated", "date_gated", "cohort_gated"]),
  config: z.record(z.unknown()).default({}),
});

export async function setProgressionRule(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseId: string,
  input: z.infer<typeof setProgressionRuleSchema>
) {
  const parsed = setProgressionRuleSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  if (!(await hasCoursePermission(supabase, userId, courseId, "course.edit"))) {
    throw new ForbiddenError("You cannot edit this course.");
  }

  const { data, error } = await supabase
    .from("progression_rules")
    .upsert(
      {
        course_id: courseId,
        target_type: parsed.data.targetType,
        target_id: parsed.data.targetId,
        rule_type: parsed.data.ruleType,
        config: parsed.data.config,
      },
      { onConflict: "course_id,target_type,target_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** draft/rejected -> submitted_for_review, or auto-publish if platform_settings allows it (§7 roadmap). */
export async function submitCourseForReview(supabase: SupabaseClient<Database>, userId: string, courseId: string) {
  if (!(await hasCoursePermission(supabase, userId, courseId, "course.publish"))) {
    throw new ForbiddenError("You cannot publish this course.");
  }

  const { data: course, error: fetchError } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (fetchError || !course) throw new NotFoundError("Course not found.");
  if (!["draft", "rejected", "unpublished"].includes(course.status)) {
    throw new InvalidStateTransitionError(`Cannot submit a course with status "${course.status}" for review.`);
  }

  const { count: moduleCount } = await supabase.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  if (!moduleCount) {
    throw new ValidationError("A course needs at least one module before it can be published.");
  }

  const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "course_publish_requires_admin_review").maybeSingle();
  const requiresReview = setting?.value === true;

  const nextStatus = requiresReview ? "submitted_for_review" : "approved";
  const { data, error } = await supabase.from("courses").update({ status: nextStatus }).eq("id", courseId).select().single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: userId,
    action: "course.submitted_for_review",
    targetType: "courses",
    targetId: courseId,
    previousState: { status: course.status },
    newState: { status: nextStatus },
  });

  if (!requiresReview) {
    return publishCourse(supabase, userId, courseId);
  }
  return data;
}

/** approved -> published. Snapshots the curriculum into course_versions (§88). */
export async function publishCourse(supabase: SupabaseClient<Database>, userId: string, courseId: string) {
  if (!(await hasCoursePermission(supabase, userId, courseId, "course.publish"))) {
    throw new ForbiddenError("You cannot publish this course.");
  }

  const { data: course, error: fetchError } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (fetchError || !course) throw new NotFoundError("Course not found.");
  if (!["approved", "submitted_for_review"].includes(course.status)) {
    throw new InvalidStateTransitionError(`Cannot publish a course with status "${course.status}".`);
  }

  const { data: modules } = await supabase
    .from("course_modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position");

  const { data: lastVersion } = await supabase
    .from("course_versions")
    .select("version_number")
    .eq("course_id", courseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersionNumber = (lastVersion?.version_number ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from("course_versions")
    .insert({ course_id: courseId, version_number: nextVersionNumber, snapshot: { modules }, created_by: userId })
    .select()
    .single();
  if (versionError) throw versionError;

  const { data, error } = await supabase
    .from("courses")
    .update({ status: "published", published_version_id: version.id, published_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: userId,
    action: "course.published",
    targetType: "courses",
    targetId: courseId,
    previousState: { status: course.status },
    newState: { status: "published", version: nextVersionNumber },
  });

  return data;
}

/** published -> unpublished. New purchases/enrollments stop; existing learners keep access per policy (§89). */
export async function unpublishCourse(supabase: SupabaseClient<Database>, userId: string, courseId: string) {
  const allowed =
    (await hasCoursePermission(supabase, userId, courseId, "course.publish")) ||
    (await hasCoursePermission(supabase, userId, courseId, "course.unpublish"));
  if (!allowed) throw new ForbiddenError("You cannot unpublish this course.");

  const { data: course, error: fetchError } = await supabase.from("courses").select("status").eq("id", courseId).single();
  if (fetchError || !course) throw new NotFoundError("Course not found.");
  if (course.status !== "published") {
    throw new InvalidStateTransitionError(`Cannot unpublish a course with status "${course.status}".`);
  }

  const { data, error } = await supabase.from("courses").update({ status: "unpublished" }).eq("id", courseId).select().single();
  if (error) throw error;

  await writeAuditLog(supabase, {
    actorId: userId,
    action: "course.unpublished",
    targetType: "courses",
    targetId: courseId,
    previousState: { status: "published" },
    newState: { status: "unpublished" },
  });

  return data;
}
