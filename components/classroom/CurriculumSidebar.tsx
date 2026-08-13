import Link from "next/link";
import { clsx } from "clsx";
import type { ClassroomState } from "@/lib/domains/enrollment/classroom";

const lessonIcon: Record<string, string> = {
  completed: "✓",
  in_progress: "•",
  not_started: "○",
};

export function CurriculumSidebar({ state, activeLessonId }: { state: ClassroomState; activeLessonId?: string }) {
  return (
    <nav className="w-full shrink-0 border-r border-border bg-surface p-4 lg:w-72">
      <p className="mb-1 text-xs font-semibold uppercase text-muted">{state.courseTitle}</p>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full bg-primary" style={{ width: `${state.coursePercent}%` }} />
      </div>
      <div className="space-y-4">
        {state.modules.map((m) => (
          <div key={m.id}>
            <p
              className={clsx(
                "mb-1 flex items-center justify-between text-sm font-medium",
                m.status === "locked" ? "text-muted" : "text-foreground"
              )}
            >
              {m.title}
              {m.status === "locked" && <span title="Locked">🔒</span>}
              {m.status === "completed" && <span title="Completed">✓</span>}
            </p>
            <ul className="ml-2 space-y-1 border-l border-border pl-3">
              {m.lessons.map((l) => {
                const locked = m.status === "locked";
                return (
                  <li key={l.id}>
                    {locked ? (
                      <span className="flex cursor-not-allowed items-center gap-2 py-1 text-sm text-muted">
                        <span>{lessonIcon[l.progressStatus]}</span> {l.title}
                      </span>
                    ) : (
                      <Link
                        href={`/learn/course/${state.courseId}/lesson/${l.id}`}
                        className={clsx(
                          "flex items-center gap-2 rounded py-1 text-sm hover:text-primary",
                          activeLessonId === l.id && "font-medium text-primary"
                        )}
                      >
                        <span>{lessonIcon[l.progressStatus]}</span> {l.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
