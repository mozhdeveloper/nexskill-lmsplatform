# Nexskill — Screen Map & API/Service Architecture

## Part 1 — Screen map

Status column: **P0** built in this session · **P1/P2** designed, not yet built (route may exist as a stub).

### Public / Guest

| Route | Role | Purpose | Primary CTA | Status |
|---|---|---|---|---|
| `/` | Guest | Marketplace home | Browse courses | P0 (minimal) |
| `/courses` | Guest | Search/filter catalog | Open course | P1 (full filters), P0 (list only) |
| `/courses/[slug]` | Guest | Course sales page | Enroll / Buy | P0 (free enroll), P1 (checkout) |
| `/categories/[slug]` | Guest | Category listing | Open course | P1 |
| `/coaches/[slug]` | Guest | Instructor public profile | Follow / view courses | P1 (P0: minimal static profile) |
| `/verify/[certificateId]` | Guest | Public certificate verification | — | P0 |
| `/login`, `/register` | Guest | Auth | Submit | P0 |
| `/become-a-coach` | Guest/Student | Coach application form | Submit application | P0 |

### Student — `/learn/*`

| Route | Purpose | Primary CTA | Data needs | Status |
|---|---|---|---|---|
| `/learn` | Dashboard: continue learning, assignments waiting, certificates | Continue Learning | active enrollments, pending reviews, recent feedback | P0 |
| `/learn/course/[courseId]` | Classroom shell — curriculum sidebar + lesson content | Mark complete / Submit | enrollment, modules, lessons, progress | P0 |
| `/learn/course/[courseId]/lesson/[lessonId]` | Lesson content renderer | Next lesson / Submit assignment | lesson content, progression lock state | P0 |
| `/learn/assignments` | All assignments across courses, filtered by state | Resubmit | submissions across enrollments | P0 |
| `/learn/certificates` | Issued certificates | Download / Share verify link | certificates | P0 |
| `/learn/certificates/[id]` | Certificate detail | Download PDF | certificate + course + coach | P0 |
| `/learn/live` | Upcoming live classes | Join | live_sessions | P1 |
| `/learn/messages` | Coach conversations | Send | conversations | P1 |
| `/learn/profile` | Learner profile + credential visibility | Save | profile | P0 (basic) |

### Coach — `/coach/*` (requires `coach` role, approved application)

| Route | Purpose | Primary CTA | Data needs | Status |
|---|---|---|---|---|
| `/coach` | Dashboard: submissions waiting, new enrollments, revenue snapshot | Go to review queue | counts across owned courses | P0 |
| `/coach/courses` | Course list | New course | courses by coach_profile_id | P0 |
| `/coach/courses/new` | Create course (metadata) | Create | — | P0 |
| `/coach/courses/[id]/builder` | Module/lesson builder, drag-reorder, assignment attach | Save / Publish | course + modules + lessons + assignments | P0 |
| `/coach/courses/[id]/students` | Enrolled students, progress | Message / view submission | enrollments for course | P0 (basic) |
| `/coach/reviews` | Review queue: submitted + resubmitted, filterable | Open submission | submissions where status in (submitted,in_review) for owned/scoped courses | P0 |
| `/coach/reviews/[submissionId]` | Grade a submission | Request revision / Pass / Fail | submission, files, rubric, prior attempts | P0 |
| `/coach/live` | Schedule/manage live classes | Schedule | live_sessions | P1 |
| `/coach/messages` | Student conversations | Send | conversations | P1 |
| `/coach/analytics` | Completion rate, drop-off, scores | — | aggregates | P1 |
| `/coach/revenue`, `/coach/payouts` | Earnings, payout history | Request payout | instructor_earnings, payouts | P1 |
| `/coach/team` | Sub-coach management, scope assignment | Invite | coach_team_members | P1 (P0: schema ready) |

### Sub-Coach

Reuses `/coach/reviews*` and any other `/coach/*` route the grant covers; the layout filters visible nav items and the domain layer filters visible data to the caller's resolved scope. No separate route tree — this is a permission projection over the coach's routes, not a parallel UI, which keeps the "coach experience" consistent regardless of who is logged in.

### Organization (P2) — `/organization/*`

| Route | Purpose | Status |
|---|---|---|
| `/organization` | Dashboard: seats used, completion overview | P2 |
| `/organization/members` | Invite/remove employees | P2 |
| `/organization/teams` | Group employees | P2 |
| `/organization/courses` | Assign courses to teams/employees | P2 |
| `/organization/reports` | Completion/assessment reports | P2 |
| `/organization/billing` | Seats, invoices | P2 |

### Admin — `/admin/*`

| Route | Purpose | Primary CTA | Status |
|---|---|---|---|
| `/admin` | Ops overview: pending coach apps, pending course review, flagged content | — | P0 (basic) |
| `/admin/coaches` | Coach application review queue | Approve / Reject / Request info | P0 |
| `/admin/coaches/[id]` | Application detail | Approve / Reject | P0 |
| `/admin/users` | User search, suspend/reinstate | Suspend | P0 (basic) |
| `/admin/courses` | Course moderation | Unpublish / Feature | P1 (P0: list only) |
| `/admin/certificates` | Certificate records, revoke/reissue | Revoke | P0 (basic) |
| `/admin/organizations` | Org management | — | P2 |
| `/admin/orders`, `/admin/payouts` | Financial ops | — | P1 |
| `/admin/reports` | Support tickets/disputes | — | P1 |
| `/admin/settings` | Platform configuration (`platform_settings`) | Save | P0 (subset: commission default, coach-approval toggle) |

## Part 2 — API / service design

Domain action endpoints, not generic CRUD, per §61. All routes require an authenticated session except where noted; all mutating routes re-resolve permissions server-side per `docs/roles-permissions.md` regardless of what the UI already checked.

### Identity / Coach onboarding
```
POST   /api/coach-applications                 submit application (student → applicant)
PATCH  /api/coach-applications/:id              update own draft
POST   /api/coach-applications/:id/approve      admin only → creates coach_profiles row
POST   /api/coach-applications/:id/reject       admin only
```

### Course authoring
```
POST   /api/courses                             create draft course (coach)
PATCH  /api/courses/:id                          edit metadata (owner/scoped)
POST   /api/courses/:id/modules                  add module
PATCH  /api/modules/:id                           edit/reorder
POST   /api/modules/:id/lessons                  add lesson
PATCH  /api/lessons/:id                           edit lesson content/type
POST   /api/courses/:id/assignments               create assignment
POST   /api/courses/:id/progression-rules         set a progression rule
POST   /api/courses/:id/submit-for-review          draft → submitted_for_review
POST   /api/courses/:id/publish                    approved → published (admin or auto per settings)
POST   /api/courses/:id/unpublish                  published → unpublished (admin or owner)
```

### Enrollment & classroom
```
POST   /api/courses/:id/enroll                    student enroll (free/admin-grant path in P0)
GET    /api/enrollments/:id/progress               curriculum + lock state for the caller
POST   /api/lessons/:id/complete                   mark lesson complete (recomputes module/course progress)
```

### Assessment
```
POST   /api/assignments/:id/submissions            student creates/submits an attempt
PATCH  /api/submissions/:id                          student edits own draft before submit
POST   /api/submissions/:id/review                  coach/sub-coach: attach feedback (does not change status alone)
POST   /api/submissions/:id/request-revision         status → revision_required, notifies student
POST   /api/submissions/:id/pass                     status → passed, triggers progression recompute
POST   /api/submissions/:id/fail                     status → failed
```

### Certification
```
POST   /api/certificates/:id/anchor                 enqueue blockchain anchor job (internal/background trigger)
GET    /api/certificates/verify/:certificateId       public — status + non-sensitive fields
POST   /api/admin/certificates/:id/revoke            admin only
```

### Admin
```
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/reinstate
PATCH  /api/admin/settings/:key
```

Deliberately **absent**: any endpoint that accepts an arbitrary `status` field for submissions, courses, or certificates (e.g. no `PATCH /submissions/:id {status:"passed"}`). Every state transition is its own verbed endpoint so the permission check and state-machine validity check are specific to that transition (§61 explicit example).

### External provider adapters called from these routes

`lib/integrations/*` — see architecture doc §6. Route handlers never import a provider SDK directly; they call the domain function, which calls the adapter interface.

## Part 3 — Error handling convention (§65)

Every route handler returns `{ error: { code, message } }` with a stable `code` (e.g. `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `INVALID_STATE_TRANSITION`) and a user-safe `message`. Unexpected exceptions are caught at the route boundary, logged server-side with a request ID, and surfaced to the client as a generic `INTERNAL_ERROR` — raw stack traces/DB errors never reach the response body.
