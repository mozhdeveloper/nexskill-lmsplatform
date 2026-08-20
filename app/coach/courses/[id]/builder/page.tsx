import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddModuleForm } from "@/components/coach/AddModuleForm";
import { AddLessonForm } from "@/components/coach/AddLessonForm";
import { ModuleControls } from "@/components/coach/ModuleControls";
import { ProgressionRuleForm } from "@/components/coach/ProgressionRuleForm";
import { PublishControls } from "@/components/coach/PublishControls";

export default async function CourseBuilderPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase.from("courses").select("*").eq("id", params.id).maybeSingle();
  if (!course) redirect("/coach/courses");

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, description, position, lessons(id, title, lesson_type, position)")
    .eq("course_id", params.id)
    .order("position")
    .returns<
      Array<{
        id: string;
        title: string;
        description: string | null;
        position: number;
        lessons: { id: string; title: string; lesson_type: string; position: number }[];
      }>
    >();

  const { data: rules } = await supabase.from("progression_rules").select("target_id, rule_type").eq("course_id", params.id).eq("target_type", "module");
  const ruleByModuleId = new Map((rules ?? []).map((r) => [r.target_id, r.rule_type]));

  const { data: assignments } = await supabase.from("assignments").select("id, title").eq("course_id", params.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <Badge>{course.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mb-8 text-sm text-muted">{course.subtitle}</p>

      <div className="mb-8 space-y-4">
        {(modules ?? []).map((m, index) => (
          <Card key={m.id}>
            <ModuleControls
              moduleId={m.id}
              title={m.title}
              description={m.description}
              isFirst={index === 0}
              isLast={index === (modules ?? []).length - 1}
            />
            <ProgressionRuleForm
              courseId={params.id}
              moduleId={m.id}
              currentRuleType={ruleByModuleId.get(m.id) ?? "sequential"}
              assignments={assignments ?? []}
            />
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              {(m.lessons ?? [])
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((l) => (
                  <li key={l.id} className="flex items-center justify-between">
                    <span>{l.title}</span>
                    <span className="text-xs text-muted">{l.lesson_type.replace(/_/g, " ")}</span>
                  </li>
                ))}
            </ul>
            <div className="mt-3">
              <AddLessonForm courseId={params.id} moduleId={m.id} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Add a module</h2>
        <AddModuleForm courseId={params.id} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Publish</h2>
        <PublishControls courseId={params.id} status={course.status} />
      </Card>
    </div>
  );
}
