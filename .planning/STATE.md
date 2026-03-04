---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 1 context gathered
last_updated: "2026-03-04T02:19:24.682Z"
last_activity: 2026-03-03 — Roadmap created (5 phases, 59 requirements mapped)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Teachers publish a professional tutoring page in under 7 minutes with zero upfront cost — Stripe Connect deferred to the moment real money is waiting.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 5 (Foundation)
Plan: 0 of 5 in current phase
Status: Ready to plan
Last activity: 2026-03-03 — Roadmap created (5 phases, 59 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Defer Stripe Connect to first booking request — removes friction at lowest motivation point
- [Roadmap]: Booking request model before teacher connects Stripe — parent submits request without payment; teacher activates in response to urgency
- [Roadmap]: Page customization (CUSTOM-*) grouped with Phase 1 — part of the onboarding/profile layer, not a separate phase
- [Roadmap]: DASH-06 (Active/Draft toggle) assigned to Phase 1 — intrinsically tied to VIS-01 page visibility

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

Last session: 2026-03-04T02:19:24.668Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-foundation/01-CONTEXT.md
