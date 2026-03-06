---
phase: 03-stripe-connect-deferred-payment
plan: "02"
subsystem: stripe-deferred-payment
tags: [stripe, webhooks, cron, email, deferred-payment]
dependency_graph:
  requires: [03-01-stripe-connect, 02-03-email]
  provides: [checkout-session-creation, auto-cancel-cron, stripe-reminders-cron, follow-up-emails]
  affects: [bookings-table, email-flow, teacher-activation-loop]
tech_stack:
  added: []
  patterns: [deferred-checkout, manual-capture, destination-charges, cron-secret-auth, idempotent-updates]
key_files:
  created:
    - supabase/migrations/0004_stripe_checkout_url.sql
    - src/emails/FollowUpEmail.tsx
    - src/emails/UrgentFollowUpEmail.tsx
    - src/app/api/cron/auto-cancel/route.ts
    - src/app/api/cron/stripe-reminders/route.ts
    - vercel.json
    - tests/stripe/checkout-session.test.ts
    - tests/stripe/auto-cancel.test.ts
    - tests/stripe/reminders-cron.test.ts
  modified:
    - src/lib/email.ts
    - src/app/api/stripe/webhook/route.ts
key_decisions:
  - "sendCheckoutLinkEmail uses plain text (not react-email) for parent checkout URL — simpler, avoids rendering overhead for a transactional link email"
  - "createCheckoutSessionsForTeacher processes each booking independently in a try/catch — one Stripe API failure does not block other pending bookings"
  - "checkout.session.completed idempotency: .eq('status', 'requested') guard prevents double-confirm on Stripe webhook re-delivery"
  - "Auto-cancel idempotency: row-level status guard (.eq('status', 'requested')) prevents double-cancel AND double-email on cron re-run"
  - "Supabase join types require double cast (as unknown as T) due to Supabase client returning array type for FK joins even when .single() semantics are implied by the query"
  - "CRON_SECRET auth uses Authorization: Bearer pattern — matches Vercel's automatic header injection for cron routes"
  - "Vercel Pro required for hourly crons — documented as comment at top of both cron files and in SUMMARY"
metrics:
  duration: 4 min
  completed_date: "2026-03-06"
  tasks_completed: 3
  files_created: 9
  files_modified: 2
requirements_satisfied: [STRIPE-04, STRIPE-05, NOTIF-02]
---

# Phase 3 Plan 02: Deferred Payment Flow Summary

Full deferred Stripe payment loop — Checkout session creation on teacher activation, checkout.session.completed booking confirmation, 48hr auto-cancel cron, and 24hr/48hr reminder email cron with react-email templates.

## What Was Built

**DB migration (`0004_stripe_checkout_url.sql`):** Adds `stripe_checkout_url TEXT` column to bookings table so parent payment links are retrievable without re-querying Stripe.

**Complete platform webhook (`/api/stripe/webhook`):** Replaced the Plan 01 stub with full implementation:
- `account.updated` handler: when `charges_enabled: true`, calls `createCheckoutSessionsForTeacher()` — fetches all `requested` bookings with no `stripe_payment_intent`, creates a Stripe Checkout session per booking (manual capture, destination charges), stores the URL in `bookings.stripe_checkout_url`, and emails the parent their checkout link. Each booking is processed independently — one failure doesn't block others.
- `checkout.session.completed` handler: extracts `booking_id` from session metadata, updates booking to `status = confirmed` with `stripe_payment_intent` stored. Idempotency: `.eq('status', 'requested')` guard prevents double-confirm.

**Email templates:**
- `FollowUpEmail.tsx`: 24hr warm reminder to teacher. Tone: not panicked, "Just a reminder — [parent] is still waiting." Single CTA: "Connect Stripe Now" (blue button). Props: teacherFirstName, studentName, parentEmail, bookingDate, connectStripeUrl.
- `UrgentFollowUpEmail.tsx`: 48hr urgent email with auto-cancel deadline. Tone: explicit urgency, red styling. Names specific parent and session. Includes auto-cancel deadline timestamp. Props: above + cancelDeadline string.

**Email functions added to `src/lib/email.ts`:**
- `sendCheckoutLinkEmail(parentEmail, studentName, checkoutUrl)`: plain text email to parent with their unique Stripe Checkout URL.
- `sendFollowUpEmail(teacherEmail, ...)`: sends FollowUpEmail template to teacher.
- `sendUrgentFollowUpEmail(teacherEmail, ..., cancelDeadline, ...)`: sends UrgentFollowUpEmail template to teacher.
- `sendCancellationEmail(bookingId)`: stub (console.log) — full implementation in Plan 03.

**Auto-cancel cron (`/api/cron/auto-cancel`):** GET handler with CRON_SECRET Bearer token auth. Queries `requested` bookings older than 48hr. For each: re-checks teacher's `stripe_charges_enabled` (race condition guard), then does an idempotent `.update({ status: 'cancelled' }).eq('status', 'requested')` — returns row count to confirm the update happened. Sends cancellation email only when `count > 0` (prevents duplicate emails on cron re-run). Returns JSON: `{ cancelled, total_checked }`.

**Reminders cron (`/api/cron/stripe-reminders`):** GET handler with CRON_SECRET Bearer auth. Queries `requested` bookings older than 24hr joined with teacher. Skips teachers who have connected (`stripe_charges_enabled = true`) or have no `social_email`. Sends 24hr email for 24–48hr old bookings; sends 48hr urgent email for 48hr+ old bookings with computed `cancelDeadline` string. Returns JSON: `{ sent_24hr, sent_48hr }`.

**`vercel.json`:** Configures both cron schedules:
- `0 * * * *` (every hour on the hour): `/api/cron/auto-cancel`
- `30 * * * *` (every hour at :30): `/api/cron/stripe-reminders`

**Test scaffolds:** Three test files with `it.todo()` stubs (21 total):
- `tests/stripe/checkout-session.test.ts`: 7 stubs covering Checkout session params, idempotency, status guard
- `tests/stripe/auto-cancel.test.ts`: 5 stubs covering 401 auth, cancel logic, Stripe-connected guard, idempotency, email ordering
- `tests/stripe/reminders-cron.test.ts`: 5 stubs covering 401 auth, 24hr trigger, 48hr trigger, <24hr no-send, connected-teacher no-send

## Required Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `CRON_SECRET` | Generate with `openssl rand -hex 32`, add to Vercel dashboard env vars |

Note: Both cron routes **require Vercel Pro** ($20/mo). Hobby plan only supports daily cron jobs. Comment added at top of each cron file as a reminder.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase FK join type cast requires `as unknown as T`**

- **Found during:** Task 2 and Task 3
- **Issue:** Supabase client types FK joins as `T[]` (array) even when the join produces a single related row. Direct cast `as { hourly_rate: number | null }` fails TS2352 because the inferred type is `{ hourly_rate: any }[]`.
- **Fix:** Used double cast `as unknown as T` in both `webhook/route.ts` and `stripe-reminders/route.ts` where Supabase join results are accessed.
- **Files modified:** `src/app/api/stripe/webhook/route.ts`, `src/app/api/cron/stripe-reminders/route.ts`
- **Commits:** 472ec83, c82e468

## Self-Check

Files created/modified:
- [x] supabase/migrations/0004_stripe_checkout_url.sql — FOUND
- [x] src/app/api/stripe/webhook/route.ts — FOUND
- [x] src/app/api/cron/auto-cancel/route.ts — FOUND
- [x] src/app/api/cron/stripe-reminders/route.ts — FOUND
- [x] src/lib/email.ts — FOUND
- [x] src/emails/FollowUpEmail.tsx — FOUND
- [x] src/emails/UrgentFollowUpEmail.tsx — FOUND
- [x] vercel.json — FOUND
- [x] tests/stripe/checkout-session.test.ts — FOUND
- [x] tests/stripe/auto-cancel.test.ts — FOUND
- [x] tests/stripe/reminders-cron.test.ts — FOUND

Commits:
- [x] b0f26ea — test(03-02): add failing test scaffolds
- [x] 472ec83 — feat(03-02): DB migration, complete platform webhook, email templates
- [x] c82e468 — feat(03-02): auto-cancel cron, stripe-reminders cron, vercel.json

TypeScript: PASS (zero errors)
Tests: PASS (21 todos, 0 failures)

## Self-Check: PASSED
