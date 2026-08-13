# Nexskill

Global skills-learning marketplace and LMS. *Learn a Skill. Prove a Skill. Build Your Future.*

This repository currently implements the **P0 vertical slice**: an admin can approve a coach, the coach can build and publish a course, a student can enroll, work through gated modules, submit a practical assignment, get reviewed (revision → resubmit → pass), complete the course, and receive a verifiable certificate. See `docs/nexskill-roadmap.md` for what's built vs. deferred to P1/P2.

## Documentation

- [`docs/nexskill-gap-analysis.md`](docs/nexskill-gap-analysis.md) — what existed before this build (nothing) and what's classified where
- [`docs/nexskill-architecture.md`](docs/nexskill-architecture.md) — system architecture, domains, auth model, integrations
- [`docs/database.md`](docs/database.md) — full schema design + ERD
- [`docs/roles-permissions.md`](docs/roles-permissions.md) — RBAC model and role/permission matrix
- [`docs/screens-and-api.md`](docs/screens-and-api.md) — screen inventory + API design
- [`docs/nexskill-roadmap.md`](docs/nexskill-roadmap.md) — P0/P1/P2 roadmap and dependency order

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth + Storage) with Row-Level Security as the authorization backstop.

## Setup

This build environment has no Node.js installed, so none of this has been run or verified locally — you'll need Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key + service role key
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/*.sql
npm run db:seed               # creates demo admin/coach/student accounts + the demo course
npm run dev                   # http://localhost:3000
```

Seed accounts (password `Nexskill!2026` for all): `admin@nexskill.dev`, `coach1@nexskill.dev` (owns the published demo course), `coach2@nexskill.dev`, `student1@nexskill.dev` / `student2@nexskill.dev` / `student3@nexskill.dev`.

Try the full loop: sign in as a student → enroll in "Professional Microblading Fundamentals" on the home page → work through Module 1/2 → submit the Module 3 practical assignment → sign in as `coach1@nexskill.dev` → `/coach/reviews` → pass or request revision → back as the student, see Module 4 unlock → complete the final assessment → certificate appears on `/learn` and is publicly checkable at `/verify/<certificate number>`.

```bash
npm run typecheck
npm run lint
npm run test
```

## Project layout

```
app/              Next.js App Router routes (pages + app/api/** route handlers)
lib/domains/      Business logic by domain — identity, coaching, learning, enrollment, assessment, certification, system
lib/integrations/ External provider adapters (video, payment, live meeting, AI, certificate anchor)
lib/supabase/     Server/browser Supabase client factories
components/       UI components (ui/, classroom/, coach/)
supabase/migrations/  SQL migrations (schema + RLS policies), in order
scripts/seed.ts   Demo data seed script
tests/            Vitest unit + integration tests
types/database.ts Hand-written Supabase types (regenerate with `supabase gen types` once linked)
```
