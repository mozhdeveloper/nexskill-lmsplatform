import type { ProgressionRuleType } from "@/types/database";

// Pure logic, deliberately dependency-free (no Supabase/Next imports) so it's unit-testable
// in isolation — see tests/progression/evaluate-rule.spec.ts.

export interface RuleContext {
  previousModuleCompleted: boolean;
  now: Date;
  passedAssignmentIds: Set<string>;
}

/**
 * Evaluates a single progression rule (§12). P0 fully implements 'open', 'sequential',
 * 'assignment_gated', and 'date_gated'. 'score_gated'/'instructor_gated'/'cohort_gated' are
 * accepted (so the rule_type enum and UI don't need to change later) but currently resolve
 * to "locked until manually built in P1/P2" — never silently treated as unlocked, since an
 * unimplemented gate must fail closed, not open.
 */
export function evaluateRule(ruleType: ProgressionRuleType, config: Record<string, unknown>, ctx: RuleContext): boolean {
  switch (ruleType) {
    case "open":
      return true;
    case "sequential":
      return ctx.previousModuleCompleted;
    case "assignment_gated": {
      const assignmentId = config.assignmentId as string | undefined;
      if (!assignmentId) return ctx.previousModuleCompleted;
      return ctx.passedAssignmentIds.has(assignmentId);
    }
    case "date_gated": {
      const unlockAt = config.unlockAt as string | undefined;
      if (!unlockAt) return ctx.previousModuleCompleted;
      return ctx.now >= new Date(unlockAt);
    }
    case "score_gated":
    case "instructor_gated":
    case "cohort_gated":
      return false;
    default:
      return false;
  }
}
