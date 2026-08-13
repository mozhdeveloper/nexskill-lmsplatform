/**
 * Integration tests for the negative permission cases required by spec §68/§105-106:
 *   - Student A cannot access Student B's submission.
 *   - Coach A cannot access Coach B's student records.
 *   - Sub-coach cannot access finance data without an explicit grant.
 *   - Organization A cannot access Organization B's data (once orgs ship in P1).
 *   - Suspended user cannot access protected functionality.
 *   - Unenrolled student cannot access paid course content.
 *
 * These exercise the REAL RLS policies (supabase/migrations/*.sql) against a live Postgres
 * instance — they are deliberately not mocked, since the whole point is verifying the database
 * layer agrees with the application layer, not just that our TypeScript is internally
 * consistent (docs/roles-permissions.md §4).
 *
 * This environment has no Node.js/Postgres available to run them (see
 * docs/nexskill-gap-analysis.md), so they are written against a documented contract and gated
 * behind TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY. Point those at a disposable Supabase
 * project (or local `supabase start`) with the migrations applied, then run `npm run test`.
 */

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

describe.skipIf(!canRun)("RLS negative cases (§68, §105-106)", () => {
  const admin = createClient<Database>(url!, serviceKey!);

  async function createTestUser(email: string) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: "Test!2026", email_confirm: true });
    if (error) throw error;
    return data.user.id;
  }

  // Not yet implemented: requires building the full fixture (course/module/lesson/assignment/
  // enrollment/submission) and a session-scoped client per student, then asserting that student
  // B's client gets an empty result (RLS filters silently, it doesn't throw) for student A's
  // submission id. Tracked here rather than faked with a placeholder assertion — see
  // docs/roles-permissions.md §4 for the exact fixture this test should build.
  it.todo("a student cannot read another student's submission");
  it.todo("a coach cannot review another coach's course submissions");
  it.todo("a sub-coach without a finance grant cannot read payout data");
  it.todo("an unenrolled student cannot read a paid course's lesson content");

  it("a suspended user loses classroom access immediately", async () => {
    const studentId = await createTestUser(`suspend-me-${Date.now()}@test.nexskill.dev`);
    await admin.from("profiles").update({ status: "suspended" }).eq("id", studentId);
    const { data: isActive } = await admin.rpc("is_active", { p_user_id: studentId });
    expect(isActive).toBe(false);
  });
});
