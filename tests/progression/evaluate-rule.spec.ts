import { describe, expect, it } from "vitest";
import { evaluateRule } from "@/lib/domains/learning/progression-rules";

describe("progression engine: evaluateRule (§12)", () => {
  const baseCtx = { previousModuleCompleted: false, now: new Date("2026-08-13T00:00:00Z"), passedAssignmentIds: new Set<string>() };

  it("'open' is always unlocked regardless of prior state", () => {
    expect(evaluateRule("open", {}, baseCtx)).toBe(true);
  });

  it("'sequential' unlocks only when the previous module is completed", () => {
    expect(evaluateRule("sequential", {}, { ...baseCtx, previousModuleCompleted: false })).toBe(false);
    expect(evaluateRule("sequential", {}, { ...baseCtx, previousModuleCompleted: true })).toBe(true);
  });

  it("'assignment_gated' unlocks only once the configured assignment has a passed submission", () => {
    const ctxWithoutPass = { ...baseCtx, passedAssignmentIds: new Set<string>() };
    const ctxWithPass = { ...baseCtx, passedAssignmentIds: new Set(["assignment-1"]) };
    expect(evaluateRule("assignment_gated", { assignmentId: "assignment-1" }, ctxWithoutPass)).toBe(false);
    expect(evaluateRule("assignment_gated", { assignmentId: "assignment-1" }, ctxWithPass)).toBe(true);
    // Passing a DIFFERENT assignment must not unlock this module (§105-style isolation).
    expect(evaluateRule("assignment_gated", { assignmentId: "assignment-2" }, ctxWithPass)).toBe(false);
  });

  it("'date_gated' unlocks only at/after the configured timestamp", () => {
    const before = { ...baseCtx, now: new Date("2026-01-01T00:00:00Z") };
    const after = { ...baseCtx, now: new Date("2026-12-01T00:00:00Z") };
    const config = { unlockAt: "2026-09-01T00:00:00Z" };
    expect(evaluateRule("date_gated", config, before)).toBe(false);
    expect(evaluateRule("date_gated", config, after)).toBe(true);
  });

  it("unimplemented gate types fail closed (locked), never silently open", () => {
    // These P1/P2 rule types aren't built yet — a locked-by-default result is required so an
    // instructor picking one of them can't accidentally leave a module permanently unlockable.
    expect(evaluateRule("score_gated", {}, { ...baseCtx, previousModuleCompleted: true })).toBe(false);
    expect(evaluateRule("instructor_gated", {}, { ...baseCtx, previousModuleCompleted: true })).toBe(false);
    expect(evaluateRule("cohort_gated", {}, { ...baseCtx, previousModuleCompleted: true })).toBe(false);
  });
});
