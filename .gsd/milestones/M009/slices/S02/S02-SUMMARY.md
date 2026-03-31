---
id: S02
parent: M009
milestone: M009
provides:
  - payment_failed status in bookings CHECK constraint — S03 cancellation flows can set this status
  - stripe_payment_method_id on recurring_schedules — populated by webhook on first session confirm, consumed by cron for all subsequent charges
  - Auto-charge cron at /api/cron/recurring-charges — processes all non-first recurring sessions 24h before they occur
  - RecurringPaymentFailedEmail + sendRecurringPaymentFailedEmail — parent + teacher notification on charge failure
  - payment_failed booking status queryable for S03 dashboard display and cancellation handling
requires:
  - slice: S01
    provides: recurring_schedules table with stripe_customer_id + stripe_payment_method_id columns; is_recurring_first flag on bookings; recurring_schedule_id FK on bookings; Stripe Customer created and stored on first booking
affects:
  - S03 — Cancellation & Dashboard Series UX depends on payment_failed status (added here) and the full recurring charge infrastructure
key_files:
  - supabase/migrations/0015_payment_failed_status.sql
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - src/emails/RecurringPaymentFailedEmail.tsx
  - src/lib/email.ts
  - src/__tests__/webhook-capture.test.ts
  - src/__tests__/recurring-charges.test.ts
  - vercel.json
  - vitest.config.ts
key_decisions:
  - Fire-and-forget pattern for recurring_schedules PM update in webhook — log warning on error but always return 200 (T01)
  - Idempotency via .is('stripe_payment_method_id', null) guard — only stores PM on first webhook delivery (T01)
  - Dedicated /api/cron/recurring-charges route at 0 12 * * * (overrides D013) — D021 records rationale: Vercel lifted cron limit to 100 in Jan 2026, dedicated route is cleaner (T02)
  - computeSessionAmount for recurring charge pricing — no session_type_id FK on bookings table (D008 deferred that column) (T02)
  - Stripe idempotencyKey = recurring-charge-{bookingId}-{tomorrowUtc} — two-layer idempotency with .eq('status','requested') DB guard (T02)
  - Added .gsd/** to vitest excludes to prevent stale worktree test pollution (T02)
patterns_established:
  - Cron route structure: CRON_SECRET auth → tomorrow UTC date → Supabase query → sequential PI loop → { charged, failed, skipped, checked } JSON response
  - Dual-variant email pattern: single React Email component with isTeacher boolean prop, parent gets CTA link, teacher gets informational copy
  - sendX email helper pattern: { bookingId } param only — function fetches all data internally via supabaseAdmin, same as sendCancellationEmail
  - Two-layer idempotency for cron Stripe PIs: idempotencyKey on Stripe create + .eq('status','requested') on DB update
observability_surfaces:
  - [recurring-charges] Charged booking {id} — logged on successful PI + booking confirmation
  - [recurring-charges] Payment failed for booking {id}: {errorCode} — logged on Stripe error + payment_failed status update
  - [recurring-charges] Skipped booking {id} — no payment method — logged when stripe_payment_method_id is null
  - [recurring-charges] Complete: charged=N failed=N skipped=N checked=N — JSON response body for Vercel cron monitoring
  - booking.status = 'payment_failed' — queryable in Supabase dashboard for ops triage
drill_down_paths:
  - .gsd/milestones/M009/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M009/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:28:33.239Z
blocker_discovered: false
---

# S02: Saved Cards & Auto-Charge Cron

**Built the full recurring-charge pipeline: payment_failed status, webhook PM storage, daily cron with idempotent Stripe PI creation, payment-failed email notifications (parent + teacher), and 16 passing tests.**

## What Happened

S02 delivered the complete auto-charge backbone for recurring sessions across two tasks.

**T01 — Foundation (migration + webhook extension)**
Added `payment_failed` to the bookings status `CHECK` constraint via migration `0015_payment_failed_status.sql`, replacing the inline constraint from migration 0001. Extended the `payment_intent.amount_capturable_updated` webhook handler to detect `recurring_schedule_id` in PI metadata and store the payment method ID on the linked `recurring_schedules` row. The update uses an `.is('stripe_payment_method_id', null)` idempotency guard — only the first webhook delivery stores the PM, re-deliveries are no-ops. The update is fire-and-forget: errors are logged but the webhook always returns 200. Added 3 new test cases (PM storage path, no-op when no recurring_schedule_id, no-op when payment_method null) bringing webhook-capture.test.ts to 8 tests total.

**T02 — Cron route and email (core deliverable)**
Created `RecurringPaymentFailedEmail.tsx` with parent (CTA link to update payment method) and teacher (informational) variants, following the established CancellationEmail pattern (UTC noon date anchor, sans-serif/f9fafb styling, 520px container). Added `sendRecurringPaymentFailedEmail({ bookingId })` to `email.ts` — it fetches booking + teacher data internally and sends parent email always, teacher email only if `social_email` is set.

The cron route at `/api/cron/recurring-charges` (GET, auth-gated on CRON_SECRET) runs at 0 12 * * * UTC daily. It queries non-first recurring bookings (`.eq('is_recurring_first', false)`) with `status='requested'` for tomorrow's date, joins `recurring_schedules!inner` for the saved payment method and `teachers!inner` for Stripe connect + hourly rate. For each session: skips if `stripe_payment_method_id` is null; computes amount via `computeSessionAmount` (no session_type_id FK on bookings — see deviation); creates a Stripe PI with `off_session:true`, `confirm:true`, `capture_method:'manual'`, 7% application fee, and an idempotencyKey of `recurring-charge-{bookingId}-{tomorrowUtc}`; on success updates booking to `confirmed` with PI ID; on Stripe error updates booking to `payment_failed` and fires `sendRecurringPaymentFailedEmail` as fire-and-forget. Returns `{ charged, failed, skipped, checked }` for Vercel cron monitoring.

Added `.gsd/**` to vitest excludes to eliminate stale worktree test pollution that was causing phantom failures in CI. Updated `vercel.json` with 4th cron entry.

**Verification:** 16/16 tests pass (8 webhook-capture + 8 recurring-charges), `tsc --noEmit` exits 0, `npm run build` succeeds with `/api/cron/recurring-charges` in route manifest.

## Verification

All slice verification checks passed:
1. `npx vitest run webhook-capture recurring-charges --reporter=verbose` → 16/16 tests pass (8 webhook-capture + 8 recurring-charges)
2. `npx tsc --noEmit` → 0 type errors
3. `npm run build` → `/api/cron/recurring-charges` confirmed in route manifest, build exits 0

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

- session_types(price) join removed from cron query — bookings has no session_type_id FK (D008: price stored in Stripe PI metadata only). Recurring charge amount computed via computeSessionAmount(start_time, end_time, hourly_rate) from teacher's hourly_rate.
- Re-delivery idempotency test replaced with null payment_method test in T01 — idempotency is verified structurally via .is('stripe_payment_method_id', null) in the PM storage test.
- Added error logging for recurring_schedules update in T01 (beyond plan's pure fire-and-forget spec) to aid debugging.
- Added .gsd/** to vitest.config.ts excludes (T02) to fix stale worktree test pollution from previous milestones.

## Known Limitations

- Parent name not collected at MVP — RecurringPaymentFailedEmail uses 'there' as recipientFirstName for parent variant ("Hi there, ...").
- Stripe Customer deduplication deferred — new Customer created per recurring booking (D020). Multiple bookings from the same parent email create separate Stripe Customers.
- computeSessionAmount uses teacher hourly_rate for all recurring charges regardless of the session type pricing chosen at booking time. If a teacher has session types with custom prices, auto-charges will use the hourly rate instead. This is a known gap until session_type_id is added to the bookings table.
- Cron runs at noon UTC (00:00 UTC midnight + 12h). Sessions starting after midnight UTC on the target day will be charged at noon the prior day — within the 24h window but not exactly 24h before. This is intentional to give a buffer for slow Stripe processing.

## Follow-ups

- S03: Cancellation & Dashboard Series UX now has full prerequisite infrastructure (payment_failed status, saved PM on recurring_schedules, cron auto-charging).
- Future: Add session_type_id FK to bookings (migration 0016) and update recurring-charges cron to use session type price when available.
- Future: Stripe Customer deduplication by parent email to avoid proliferation of Customer objects.

## Files Created/Modified

- `supabase/migrations/0015_payment_failed_status.sql` — New migration: adds payment_failed to bookings status CHECK constraint
- `src/app/api/stripe/webhook/route.ts` — Extended payment_intent.amount_capturable_updated handler to store stripe_payment_method_id on recurring_schedules with idempotency guard
- `src/app/api/cron/recurring-charges/route.ts` — New daily cron route: auto-charges saved cards 24h before recurring sessions
- `src/emails/RecurringPaymentFailedEmail.tsx` — New React Email template: dual-variant (parent CTA + teacher informational) payment failure notification
- `src/lib/email.ts` — Added sendRecurringPaymentFailedEmail helper following sendCancellationEmail pattern
- `src/__tests__/webhook-capture.test.ts` — Added 3 new tests: PM storage, no-op without recurring_schedule_id, no-op with null payment_method
- `src/__tests__/recurring-charges.test.ts` — New test file: 8 integration tests covering auth, no-op, success, failure, skip, idempotency, fee calculation, mixed results
- `vercel.json` — Added 4th cron entry: /api/cron/recurring-charges at 0 12 * * *
- `vitest.config.ts` — Added .gsd/** to exclude list to prevent stale worktree test pollution
