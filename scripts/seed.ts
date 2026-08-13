/**
 * Nexskill seed script (§77-78). Creates the demo users and the "Professional Microblading
 * Fundamentals" demo course used to exercise the full P0 loop end to end. Run with:
 *   npm run db:seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * Idempotent: re-running skips anything that already exists by email/slug.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed script.");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey);

const SEED_PASSWORD = "Nexskill!2026";

async function ensureUser(email: string, displayName: string, roleKeys: string[]) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  let userId = found?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`created user ${email}`);
  } else {
    console.log(`user ${email} already exists`);
  }

  for (const key of roleKeys) {
    const { data: role } = await supabase.from("roles").select("id").eq("key", key).single();
    if (role) {
      await supabase.from("user_roles").upsert({ user_id: userId, role_id: role.id }, { onConflict: "user_id,role_id" });
    }
  }

  return userId;
}

async function ensureCoachProfile(userId: string, slug: string, headline: string) {
  const { data: existing } = await supabase.from("coach_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("coach_profiles")
    .insert({ user_id: userId, slug, headline, verified: true })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`created coach profile ${slug}`);
  return data.id;
}

async function seedDemoCourse(coachProfileId: string) {
  const { data: existing } = await supabase.from("courses").select("id, status").eq("slug", "professional-microblading-fundamentals").maybeSingle();
  if (existing) {
    console.log("demo course already exists");
    return existing.id;
  }

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      coach_profile_id: coachProfileId,
      title: "Professional Microblading Fundamentals",
      slug: "professional-microblading-fundamentals",
      subtitle: "Theory, tools, guided practice, and a graded practical assessment.",
      description:
        "A structured, mentored path from microblading theory through supervised practice to a final assessed technique — ending in a verifiable Nexskill certificate.",
      level: "beginner",
      course_type: "mentored",
      pricing_model: "free",
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;
  console.log("created demo course");

  const modulesSpec = [
    { title: "Module 1 — Theory", lessons: [{ title: "Welcome & Safety Overview", type: "rich_text" }, { title: "Skin Anatomy Basics", type: "rich_text" }] },
    { title: "Module 2 — Tools & Setup", lessons: [{ title: "Tool Kit Walkthrough", type: "video" }, { title: "Workstation Setup Checklist", type: "checklist" }] },
    { title: "Module 3 — Guided Practice", lessons: [{ title: "Practice Session Assignment", type: "practical_assignment" }] },
    { title: "Module 4 — Advanced Technique & Final Assessment", lessons: [{ title: "Advanced Stroke Patterns", type: "rich_text" }, { title: "Final Assessment", type: "practical_assignment" }] },
  ];

  let previousModuleId: string | null = null;
  let practiceAssignmentId: string | null = null;

  for (const [index, spec] of modulesSpec.entries()) {
    const { data: courseModule, error: moduleError } = await supabase
      .from("course_modules")
      .insert({ course_id: course.id, title: spec.title, position: index })
      .select()
      .single();
    if (moduleError) throw moduleError;

    for (const [lessonIndex, lessonSpec] of spec.lessons.entries()) {
      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          module_id: courseModule.id,
          title: lessonSpec.title,
          lesson_type: lessonSpec.type as Database["public"]["Tables"]["lessons"]["Row"]["lesson_type"],
          position: lessonIndex,
        })
        .select()
        .single();
      if (lessonError) throw lessonError;

      if (lessonSpec.type === "practical_assignment") {
        const isFinal = spec.title.includes("Final");
        const { data: assignment, error: assignmentError } = await supabase
          .from("assignments")
          .insert({
            course_id: course.id,
            lesson_id: lesson.id,
            title: isFinal ? "Final Technique Assessment" : "Practice Session Submission",
            instructions: isFinal
              ? "Describe your final microblading technique session in detail: preparation, stroke pattern chosen, and aftercare instructions given to the client."
              : "Describe your guided practice session: what you practiced, what felt difficult, and one question for your coach.",
            required_submission_types: ["text"],
          })
          .select()
          .single();
        if (assignmentError) throw assignmentError;
        await supabase.from("lessons").update({ assignment_id: assignment.id }).eq("id", lesson.id);
        if (!isFinal) practiceAssignmentId = assignment.id;
      }
    }

    if (index === 0) {
      await supabase.from("progression_rules").insert({ course_id: course.id, target_type: "module", target_id: courseModule.id, rule_type: "open" });
    } else if (index === 2 && practiceAssignmentId) {
      await supabase.from("progression_rules").insert({ course_id: course.id, target_type: "module", target_id: courseModule.id, rule_type: "sequential" });
    } else {
      await supabase.from("progression_rules").insert({ course_id: course.id, target_type: "module", target_id: courseModule.id, rule_type: "sequential" });
    }

    previousModuleId = courseModule.id;
  }
  void previousModuleId;

  return course.id;
}

async function publishDemoCourse(courseId: string, actorUserId: string) {
  const { data: course } = await supabase.from("courses").select("status").eq("id", courseId).single();
  if (course?.status === "published") return;

  const { data: modules } = await supabase.from("course_modules").select("id, lessons(*)").eq("course_id", courseId).order("position");
  const { data: lastVersion } = await supabase.from("course_versions").select("version_number").eq("course_id", courseId).order("version_number", { ascending: false }).limit(1).maybeSingle();
  const { data: version, error } = await supabase
    .from("course_versions")
    .insert({ course_id: courseId, version_number: (lastVersion?.version_number ?? 0) + 1, snapshot: { modules }, created_by: actorUserId })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("courses").update({ status: "published", published_version_id: version.id, published_at: new Date().toISOString() }).eq("id", courseId);
  console.log("published demo course");
}

async function main() {
  console.log("Seeding Nexskill demo data...\n");

  const adminId = await ensureUser("admin@nexskill.dev", "Nexskill Admin", ["super_admin"]);
  const coach1Id = await ensureUser("coach1@nexskill.dev", "Mozhde Marivani", ["coach"]);
  await ensureUser("coach2@nexskill.dev", "Ali Bahrami", ["coach"]);
  await ensureUser("student1@nexskill.dev", "Priya Santos", []);
  await ensureUser("student2@nexskill.dev", "Diego Fernandez", []);
  await ensureUser("student3@nexskill.dev", "Amara Chen", []);

  const coachProfileId = await ensureCoachProfile(coach1Id, "mozhde-marivani", "Master PMU Trainer, 10+ years");

  const courseId = await seedDemoCourse(coachProfileId);
  await publishDemoCourse(courseId, adminId);

  console.log("\nDone. Seed accounts (password for all: " + SEED_PASSWORD + "):");
  console.log("  admin@nexskill.dev    — Super Admin");
  console.log("  coach1@nexskill.dev   — Coach (owns the demo course)");
  console.log("  coach2@nexskill.dev   — Coach (no courses yet)");
  console.log("  student1@nexskill.dev — Student");
  console.log("  student2@nexskill.dev — Student");
  console.log("  student3@nexskill.dev — Student");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
