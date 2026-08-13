# Nexskill — Gap Analysis

**Date:** 2026-08-13
**Scope:** Compares the current repository state against the Nexskill master specification.

## A. Existing System Audit

The working directory (`C:\Users\Nexvision\Downloads`) contained no Nexskill code, no git repository, and no LMS-related project files. It is the user's personal Downloads folder (media files, business documents, unrelated PDFs/videos).

One adjacent artifact was found: `BeautyConnect_Project_Memory_Export_FULL.md`. This documents a **different** Nexvision Innovations Inc. product — a beauty industry marketplace/booking/POS platform. It is not Nexskill and shares no code. It is relevant only as evidence that this organization has prior experience running multi-tenant SaaS product efforts, and that BeautyConnect's scope notes "Academy/training/LMS concepts" as a *future, unbuilt* idea — which Nexskill now formalizes into its own dedicated product rather than being bolted onto BeautyConnect.

**Conclusion: Nexskill is a greenfield build.** There is nothing to migrate, refactor, or preserve. Every item in the specification is classified as "Missing" below unless noted.

No Node.js/npm toolchain is installed in this environment (only `git` is available). This does not block writing source code, but it does mean `npm install`, type-checking, linting, and running the dev server cannot happen inside this session — the user must run these locally. See `docs/nexskill-architecture.md` → Deployment for exact commands.

## B. Gap Classification

Legend: **Missing** (nothing exists) · **P0** (in first vertical slice) · **P1**/**P2** (later phase, per roadmap).

| Spec Area | Section(s) | Status | Phase |
|---|---|---|---|
| Auth, profiles, RBAC foundation | 4, 55 (Identity) | Missing → building | P0 |
| Admin foundation, coach application/approval | 8, 7 | Missing → building | P0 |
| Categories/tags (marketplace taxonomy) | 19, 20 | Missing | P1 |
| Course builder (modules/lessons) | 10, 11 | Missing → building | P0 |
| Progression engine (rules-driven) | 12 | Missing → building (subset: sequential + assignment-gated) | P0 (full rule types P1) |
| Practical assignment + submission + review workflow | 13, 14 | Missing → building | P0 |
| Student classroom | 15, 16 | Missing → building | P0 |
| Coach dashboard / review queue | 17, 18 | Missing → building | P0 |
| Course completion engine | 33 | Missing → building (rule-driven, minimal rule set) | P0 |
| Certificates + QR verification | 34 | Missing → building | P0 |
| Blockchain certificate anchoring | 35 | Missing (adapter interface only, no-op provider) | P1 |
| Marketplace discovery, search, sales pages | 19–23 | Missing | P1 |
| Payments, orders, commission, payouts, coupons | 37–41 | Missing (enrollment initially via free/admin-grant path only) | P1 |
| Enrollment sourcing beyond manual/free | 42–43 | Partial in P0 (manual + free only) | P0 partial / P1 full |
| Cohorts, attendance | 44–45 | Missing | P2 |
| Live classes (Google Meet) | 24, 97 | Missing (adapter interface only) | P1 |
| Video hosting abstraction | 25 | Missing (adapter interface only; local/Supabase Storage stand-in for dev) | P1 |
| Messaging, announcements | 26–27 | Missing | P1 |
| Community | 28 | Missing | P2 |
| Notifications | 29 | Missing (in-app only, minimal) | P1 |
| Localization/i18n scaffolding | 30 | Missing | P2 |
| AI Study Assistant / AI Coach tools | 31–32 | Missing (adapter interface only) | P2 |
| Sub-coach / team permissions | 5, 55 | Missing (schema modeled in P0 docs; UI/API P1) | P1 |
| Organizations / B2B seats | 6, 55 | Missing | P2 |
| Admin portal (users/coaches/courses/finance/certs/support) | 7 | Missing (P0: coach approval + course moderation only) | P0 partial / P1 full |
| Reviews | 23 | Missing | P1 |
| Learning analytics / risk indicators | 46–47 | Missing | P2 |
| Gamification | 48 | Missing | P2 |
| Audit log | 49 | Missing (P0: minimal audit table + writes on sensitive actions) | P0 partial |
| Security architecture (auth, RLS, RBAC, rate limiting, upload validation) | 50 | Missing → building foundational layer | P0 |
| Multi-tenancy boundaries (platform/instructor/org) | 52 | Missing → modeled in schema; org tenancy P2 | P0 model / P2 full |
| Design system / tokens | 58 | Missing → building minimal token set | P0 |
| Route structure | 60 | Missing → building P0 subset | P0 |
| API design (domain actions, not generic CRUD) | 61 | Missing → building for P0 endpoints | P0 |
| Idempotent webhooks | 62 | Missing (no payment provider wired yet; interface documented) | P1 |
| Background jobs | 63 | Missing (P0 uses synchronous certificate issuance; queue interface documented for P1) | P0 stub / P1 full |
| Integration adapters (Video/Payment/Email/SMS/LiveMeeting/AI/CertAnchor/Storage) | 64 | Missing → interfaces defined, no-op/dev implementations for P0 | P0 interfaces |
| Error handling conventions | 65 | Missing → building | P0 |
| Testing (unit/integration/e2e) | 67–68 | Missing → minimal permission + progression tests in P0 | P0 partial |
| SEO | 70 | Missing | P1 |
| Feature flags | 71 | Missing → minimal flags table | P1 |
| Documentation set | 75 | Building now (this doc + 6 companions) | P0 |
| Migrations | 76 | Missing → building | P0 |
| Seed data | 77–78 | Missing → building demo course + seed users | P0 |

## C. What "P0 vertical slice" means here

Per spec section 101, the first slice must prove the full loop:
admin approves coach → coach builds course → publishes → student registers/enrolls → completes lessons → submits assignment → coach reviews → revision → resubmit → pass → module unlocks → course completes → certificate issued → publicly verifiable.

Everything needed to make that loop **real** (not mocked) is P0: auth, RBAC, course builder, enrollment, classroom with progression gating, assignment submission/review, certificate issuance + verification page. Payments are stubbed as "free/admin-granted enrollment" in P0 — checkout is P1 — so the loop is genuine without requiring a payment gateway credential up front.

See `docs/nexskill-roadmap.md` for the full P0/P1/P2 breakdown and dependency order.
