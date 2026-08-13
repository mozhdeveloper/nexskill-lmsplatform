# Nexskill — Role & Permission Matrix

## 1. Model

Roles are **not** a single enum column. A user has zero or more rows in `user_roles`; each role has default permissions in `role_permissions`; `user_permissions` can grant/revoke individual capabilities per user; sub-coach access additionally layers `coach_team_members` scoped grants on top. Effective permission resolution order for a given (`user`, `permission`, `resource`) triple:

1. Is there a `user_permissions` row with `effect='revoke'` for this permission? → **deny**, full stop.
2. Does the user hold a role whose `role_permissions` includes this permission, **and** (for resource-scoped permissions) does the resource fall within that role's natural ownership (e.g. coach owns the course)? → **allow**.
3. Is there a `coach_team_members` row for this user where `scope_type`/`scope_id` covers the resource and `permission_keys` includes this permission, and `status='active'`? → **allow**.
4. Is there a `user_permissions` row with `effect='grant'`? → **allow**.
5. Otherwise → **deny**.

This satisfies §68's permission tests: revoking a sub-coach's `coach_team_members` row immediately removes access (step 3 no longer matches, no cache to bust); Coach A's ownership never satisfies step 2 for Coach B's course.

## 2. Roles

| Role key | Who |
|---|---|
| `guest` | Unauthenticated visitor |
| `student` | Any authenticated user taking courses |
| `coach` | Approved instructor; owns courses/students under their `coach_profile_id` |
| `sub_coach` | Person granted scoped access via `coach_team_members` (title varies: assistant coach, evaluator, moderator — same mechanism) |
| `org_owner` | Creates/owns an organization tenant (P2) |
| `org_admin` | Delegated org management, fewer rights than owner (P2) |
| `support` | Nexskill staff — tickets, disputes, limited user visibility |
| `finance_admin` | Nexskill staff — commissions, payouts, refunds, financial reporting |
| `content_moderator` | Nexskill staff — course/review/community moderation |
| `super_admin` | Full platform control |

A single person commonly holds more than one role (e.g. `student` + `coach`).

## 3. Matrix

Legend: ✅ full · 🟡 scoped/conditional (see note) · — not permitted

| Operation | Guest | Student | Coach | Sub-Coach | Org Owner | Org Admin | Support | Finance Admin | Content Mod. | Super Admin |
|---|---|---|---|---|---|---|---|---|---|---|
| Browse marketplace, view course/coach public pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / purchase course | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Enroll, access classroom, submit assignments | — | 🟡 own enrollments only | — | — | — | — | — | — | — | ✅ (support access) |
| Apply to become coach | — | ✅ | ✅ (re-apply n/a) | — | — | — | — | — | — | — |
| Review/approve/reject coach application | — | — | — | — | — | — | — | — | 🟡 if granted | ✅ |
| Create/edit/publish own course | — | — | 🟡 own courses | 🟡 course-scoped grant | — | — | — | — | — | ✅ |
| Unpublish/feature/moderate any course | — | — | — | — | — | — | — | — | ✅ | ✅ |
| Set course pricing / commission override | — | — | 🟡 own courses, base rate only | — (never; excluded even with course scope) | — | — | — | 🟡 view only | — | ✅ |
| Review submission / send feedback | — | — | 🟡 own courses | 🟡 if `submission.review` in scope | — | — | — | — | — | ✅ |
| Pass / fail / request revision | — | — | 🟡 own courses | 🟡 if `submission.pass` in scope | — | — | — | — | — | ✅ |
| Appoint/manage sub-coaches, set their scope | — | — | 🟡 own account only | — | — | — | — | — | — | ✅ |
| View own course revenue/enrollment analytics | — | — | 🟡 own courses | 🟡 if `analytics.view` in scope | — | — | — | ✅ all | — | ✅ |
| View/request payout | — | — | 🟡 own earnings | — (never — payout excluded from sub-coach delegation per §5) | — | — | — | ✅ | — | ✅ |
| Process refund | — | 🟡 request own | — | — | — | — | 🟡 initiate, needs finance approval | ✅ approve | — | ✅ |
| Change global commission / platform settings | — | — | — | — | — | — | — | 🟡 commission only | — | ✅ |
| Issue / revoke certificate | — | — | 🟡 own courses (issue via completion engine, not manual) | — | — | — | — | — | — | ✅ revoke |
| Verify certificate (public) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Suspend / reinstate user | — | — | — | — | — | — | 🟡 flag only | — | — | ✅ |
| Purchase org seats, invite employees | — | — | — | — | 🟡 own org | 🟡 own org, if delegated | — | — | — | ✅ |
| View org-wide employee progress | — | — | — | — | 🟡 own org | 🟡 own org | — | — | — | ✅ |
| Moderate community post/review/report | — | — | — | — | — | — | 🟡 triage | — | ✅ | ✅ |
| Read audit log | — | — | — | — | — | — | 🟡 own-ticket-relevant | 🟡 financial entries | 🟡 moderation entries | ✅ full |

Notes on 🟡:
- "Scoped" for coach/sub-coach always resolves against the specific `course_id`/`cohort_id`/etc. in the request, per the resolution algorithm in §1 — there is no "coach" permission that is global across all coaches' data.
- Sub-coach scope **never** includes pricing, payouts, or account deletion regardless of how broad the grant is (§5) — these permission keys are excluded from the set `coach_team_members.permission_keys` is allowed to contain, enforced by a check constraint / application-level allow-list, not just convention.
- Org roles are fully scoped to `organization_id`; Org A can never resolve `true` for Org B's resource (§106).

## 4. Testing this matrix

`tests/permissions/*.spec.ts` (see `docs/nexskill-roadmap.md` P0 testing tasks) encodes the negative cases directly from §68 and §105–106: cross-student submission access, cross-coach student records, sub-coach finance access without grant, cross-org access, suspended-user access, unenrolled-student paid-content access. These are integration tests against the real RLS policies (via a test Supabase project/local Postgres), not unit tests against mocked permission logic — the whole point is verifying the DB layer agrees with the application layer.
