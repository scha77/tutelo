---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 03-04-PLAN.md — Auto-Cancel Email Dispatch Bug Fix
last_updated: "2026-03-06T19:47:18.465Z"
last_activity: "2026-03-05 — Plan 01-05 complete: /[slug] profile page + dashboard verified in browser (checkpoint approved)"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Teachers publish a professional tutoring page in under 7 minutes with zero upfront cost — Stripe Connect deferred to the moment real money is waiting.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 5 (Foundation) — COMPLETE
Plan: All 5 plans complete
Status: Ready — Phase 1 Foundation fully complete, Phase 2 Booking Requests is next
Last activity: 2026-03-05 — Plan 01-05 complete: /[slug] profile page + dashboard verified in browser (checkpoint approved)

Progress: [██████████] 100% (Phase 1)

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
| Phase 01-foundation P04 | 60 | 6 tasks | 12 files |
| Phase 01-foundation P05 | 90 | 2 tasks | 24 files |
| Phase 02-booking-requests P01 | 4 | 3 tasks | 8 files |
| Phase 02-booking-requests P03 | 4 | 2 tasks | 7 files |
| Phase 03-stripe-connect-deferred-payment P01 | 3 | 3 tasks | 5 files |
| Phase 03-stripe-connect-deferred-payment P02 | 4 | 3 tasks | 11 files |
| Phase 03-stripe-connect-deferred-payment P03 | 6 | 3 tasks | 14 files |
| Phase 03-stripe-connect-deferred-payment P04 | 5 | 1 tasks | 1 files |

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
- [Phase 01-foundation]: [01-04]: Insert-then-update instead of upsert for partial wizard saves — avoids NOT NULL violations on unfilled columns
- [Phase 01-foundation]: [01-04]: Auto-slug inserted on signIn (first teacher row creation), not Step 3 — ensures slug exists early for collision resolution
- [Phase 01-foundation]: [01-04]: teachers.user_id UNIQUE constraint required for insert-then-update wizard save pattern
- [Phase 01-foundation]: [01-05]: Fixed reference date (2025-01-13) in timezone conversion avoids DST flakiness in tests
- [Phase 01-foundation]: [01-05]: isDraftPage extracted to profile.ts for unit testability without RSC server context
- [Phase 01-foundation]: [01-05]: Dashboard is desktop-first for MVP — Sidebar hidden on mobile, responsive is Phase 2+ enhancement
- [Phase 01-foundation]: [01-05]: CSS custom property --accent on &lt;main&gt; element enables page-wide accent color theming without prop drilling
- [Phase 01-foundation]: [01-05]: Postgres TIME columns return HH:MM:SS format — normalize to HH:MM before timezone conversion in any component consuming availability slots
- [Phase 02-booking-requests]: Zod v4 requires RFC 4122-compliant UUIDs in tests (550e8400-e29b-41d4-a716-446655440000 pattern)
- [Phase 02-booking-requests]: Dynamic import of email module with @ts-expect-error to defer Plan 02-03 dependency
- [Phase 02-booking-requests]: Badge uses href comparison ('/dashboard/requests') not label string for coupling safety
- [Phase 02-booking-requests]: Layout-level Stripe banner is conditional block in layout (not separate component) — per CONTEXT.md locked decision
- [Phase 02-booking-requests]: vi.mock('@/lib/email') in test file prevents Vite import analysis error for dynamic import in bookings.ts
- [Phase 02-booking-requests]: vi.hoisted() + class-based MockResend required for Vitest ESM mocking of new Resend() — vi.fn().mockImplementation() is not a constructor in Vitest's SSR transform
- [Phase 02-booking-requests]: Module-level const resend = new Resend() works with class-based mock — no lazy-init needed for testability
- [Phase 03-stripe-connect-deferred-payment]: connectStripe returns Promise<void> — form action type contract; unauthenticated cases redirect('/login') instead of returning error objects
- [Phase 03-stripe-connect-deferred-payment]: Idempotency guard in account.updated webhook: checks !stripe_charges_enabled before update to prevent duplicate processing on repeated delivery
- [Phase 03-stripe-connect-deferred-payment]: sendCheckoutLinkEmail uses plain text (not react-email) for parent checkout URL — simpler, avoids rendering overhead for a transactional link email
- [Phase 03-stripe-connect-deferred-payment]: checkout.session.completed idempotency: .eq(status, requested) guard prevents double-confirm on Stripe webhook re-delivery
- [Phase 03-stripe-connect-deferred-payment]: Auto-cancel idempotency: row-level status guard prevents double-cancel AND double-email on cron re-run
- [Phase 03-stripe-connect-deferred-payment]: supabaseAdmin used in all three email functions — not createClient() — because these are called from webhook handlers with no user session
- [Phase 03-stripe-connect-deferred-payment]: fire-and-forget sendSessionCompleteEmail in markSessionComplete — avoids blocking payment capture response on email delivery latency
- [Phase 03-stripe-connect-deferred-payment]: review URL stub /review?booking=bookingId in SessionCompleteEmail — link embedded so parent has it once Phase 5 ships the actual review flow
- [Phase 03-stripe-connect-deferred-payment]: Chain .select('id') on Supabase JS v2 .update() calls to get affected rows — count is always null without explicit count preference header

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

- Fix pre-existing test failure in tests/auth/signup.test.ts (introduced in 01-04 signIn refactor, out of scope for 01-05)

### Blockers/Concerns

- Supabase free tier pauses after 1 week of inactivity — upgrade to Pro ($25/mo) before any public launch
- GTM validation: Instagram content-to-commerce conversion is empirically unknown — validate intent before full build commitment
- Legal: 1099-K threshold in flux as of Aug 2025 — verify current IRS guidance before writing onboarding copy

## Session Continuity

Last session: 2026-03-06T19:47:18.463Z
Stopped at: Completed 03-04-PLAN.md — Auto-Cancel Email Dispatch Bug Fix
Resume file: None
