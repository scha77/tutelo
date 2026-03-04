---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-foundation/01-02-PLAN.md
last_updated: "2026-03-04T17:17:47.344Z"
last_activity: "2026-03-04 — Plan 01-01 complete: Next.js 16 foundation bootstrapped"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Teachers publish a professional tutoring page in under 7 minutes with zero upfront cost — Stripe Connect deferred to the moment real money is waiting.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 5 (Foundation)
Plan: 1 of 5 in current phase
Status: In progress
Last activity: 2026-03-04 — Plan 01-01 complete: Next.js 16 foundation bootstrapped

Progress: [█░░░░░░░░░] 7%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 6 min
- Total execution time: 6 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1/5 | 6 min | 6 min |

**Recent Trend:**
- Last 5 plans: 01-01 (6 min)
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P03 | 3 | 2 tasks | 2 files |
| Phase 01-foundation P02 | 45 | 3 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Defer Stripe Connect to first booking request — removes friction at lowest motivation point
- [Roadmap]: Booking request model before teacher connects Stripe — parent submits request without payment; teacher activates in response to urgency
- [Roadmap]: Page customization (CUSTOM-*) grouped with Phase 1 — part of the onboarding/profile layer, not a separate phase
- [Roadmap]: DASH-06 (Active/Draft toggle) assigned to Phase 1 — intrinsically tied to VIS-01 page visibility
- [01-01]: proxy.ts uses getClaims() with data?.claims ?? null — handles nullable union type in TypeScript strict mode
- [01-01]: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not ANON_KEY — post-Nov 2025 Supabase projects use new key names
- [01-01]: Wave 0 test stubs use it.todo() not it.skip — produces green vitest run without false confidence
- [01-01]: sonner used for toasts (shadcn/ui v4 deprecated old toast component in favor of sonner)
- [Phase 01-foundation]: availability TIME columns interpreted relative to teachers.timezone (IANA string) — correct pattern for recurring weekly slots
- [Phase 01-foundation]: bookings_anon_insert uses WITH CHECK (true) — deliberately permissive for Phase 2 guest booking; Phase 2 will tighten
- [Phase 01-foundation]: bookings.teacher_id has no ON DELETE CASCADE — preserves booking history audit trail if teacher deleted
- [Phase 01-02]: middleware.ts required as Next.js 16.1.6 entry point — proxy.ts is invoked from middleware.ts, not used directly as middleware filename
- [Phase 01-02]: OAuth callback wraps teachers table query in try/catch defaulting to /onboarding — resilient until Plan 01-03 creates the schema
- [Phase 01-02]: LoginForm uses two-mode (signin/signup) toggle rather than separate pages — reduces nav complexity

### Critical Pitfalls to Embed in Phase 1

- Use `proxy.ts` not `middleware.ts` — Next.js 16 breaking change
- All timestamps must be `timestamptz` — never bare `timestamp`
- IANA timezone column (`TEXT NOT NULL`) required on `teachers` table from day one
- Use `@supabase/ssr` — NOT deprecated `@supabase/auth-helpers-nextjs`
- Use `supabase.auth.getUser()` — NOT `getSession()` (insecure)
- Enable RLS immediately on every table; test as authenticated user, not from Studio
- Atomic booking creation via `supabase.rpc()` + DB unique constraint on `(teacher_id, booking_date, start_time)`

### Critical Pitfalls for Phase 3 (Stripe)

- Two separate webhook endpoints: `/api/stripe/webhook` (platform) and `/api/stripe-connect/webhook` (connected-account)
- Two separate signing secrets: `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`
- Use `req.text()` in all webhook handlers — never `req.json()` (destroys raw bytes, breaks signature verification)
- Never attempt PaymentIntent creation until `charges_enabled: true` confirmed via webhook

### Pending Todos

None yet.

### Blockers/Concerns

- Supabase free tier pauses after 1 week of inactivity — upgrade to Pro ($25/mo) before any public launch
- GTM validation: Instagram content-to-commerce conversion is empirically unknown — validate intent before full build commitment
- Legal: 1099-K threshold in flux as of Aug 2025 — verify current IRS guidance before writing onboarding copy

## Session Continuity

Last session: 2026-03-04T17:17:47.342Z
Stopped at: Completed 01-foundation/01-02-PLAN.md
Resume file: None
