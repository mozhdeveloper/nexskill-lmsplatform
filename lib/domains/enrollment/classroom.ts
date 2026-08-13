import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ForbiddenError, NotFoundError } from "@/lib/domains/identity/permissions";

export interface ClassroomLesson {
  id: string;
  title: string;
  position: number;
  lessonType: string;
  isRequired: boolean;
  assignmentId: string | null;
  progressStatus: "not_started" | "in_progress" | "completed";
}

export interface ClassroomModule {
  id: string;
  title: string;
  position: number;
  status: "locked" | "unlocked" | "completed";
  lessons: ClassroomLesson[];
}

export interface ClassroomState {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  enrollmentStatus: string;
  coursePercent: number;
  modules: ClassroomModule[];
}

/** Loads the full curriculum + this student's lock/progress state — the single read model the classroom UI renders from. */
export async function getClassroomState(
  supabase: SupabaseClient<Database>,
  studentId: string,
  courseId: string
): Promise<ClassroomState> {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, status, course_id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (!enrollment) throw new ForbiddenError("You are not enrolled in this course.");

  const { data: course } = await supabase.from("courses").select("id, title").eq("id", courseId).single();
  if (!course) throw new NotFoundError("Course not found.");

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, position, lessons(id, title, position, lesson_type, is_required, assignment_id)")
    .eq("course_id", courseId)
    .order("position");

  const { data: moduleProgressRows } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("enrollment_id", enrollment.id);
  const moduleStatusById = new Map((moduleProgressRows ?? []).map((r) => [r.module_id, r.status]));

  const { data: lessonProgressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("enrollment_id", enrollment.id);
  const lessonStatusById = new Map((lessonProgressRows ?? []).map((r) => [r.lesson_id, r.status]));

  const { data: courseProgress } = await supabase.from("course_progress").select("percent").eq("enrollment_id", enrollment.id).maybeSingle();

  type RawLesson = { id: string; title: string; position: number; lesson_type: string; is_required: boolean; assignment_id: string | null };
  type RawModule = { id: string; title: string; position: number; lessons: RawLesson[] };

  const orderedModules: ClassroomModule[] = ((modules ?? []) as unknown as RawModule[]).map((m) => ({
    id: m.id,
    title: m.title,
    position: m.position,
    status: (moduleStatusById.get(m.id) as "locked" | "unlocked" | "completed") ?? "locked",
    lessons: [...m.lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        title: l.title,
        position: l.position,
        lessonType: l.lesson_type,
        isRequired: l.is_required,
        assignmentId: l.assignment_id,
        progressStatus: (lessonStatusById.get(l.id) as "not_started" | "in_progress" | "completed") ?? "not_started",
      })),
  }));

  return {
    enrollmentId: enrollment.id,
    courseId: course.id,
    courseTitle: course.title,
    enrollmentStatus: enrollment.status,
    coursePercent: courseProgress?.percent ?? 0,
    modules: orderedModules,
  };
}

/**
 * Server-side gate for opening a single lesson. Called by the lesson page itself so that
 * directly navigating to a locked lesson's URL 404s/403s instead of rendering content (§102).
 */
export async function assertLessonAccessible(supabase: SupabaseClient<Database>, studentId: string, lessonId: string) {
  const { data: lesson } = await supabase.from("lessons").select("id, module_id").eq("id", lessonId).maybeSingle();
  if (!lesson) throw new NotFoundError("Lesson not found.");

  const { data: courseModule } = await supabase.from("course_modules").select("id, course_id").eq("id", lesson.module_id).single();
  if (!courseModule) throw new NotFoundError("Module not found.");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseModule.course_id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (!enrollment) throw new ForbiddenError("You are not enrolled in this course.");

  const { data: moduleProgress } = await supabase
    .from("module_progress")
    .select("status")
    .eq("enrollment_id", enrollment.id)
    .eq("module_id", courseModule.id)
    .maybeSingle();
  if (!moduleProgress || moduleProgress.status === "locked") {
    throw new ForbiddenError("This lesson is locked until earlier requirements are completed.");
  }

  return { enrollmentId: enrollment.id, courseId: courseModule.course_id };
}
