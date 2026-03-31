---
id: M009
title: "Recurring Sessions"
status: complete
completed_at: 2026-03-31T15:00:12.822Z
key_decisions:
  - D018: UTC noon anchor (new Date(`${dateStr}T12:00:00Z`)) for all recurring date arithmetic in generateRecurringDates — prevents DST edge cases that midnight-anchored arithmetic would cause; validated by a test crossing a DST boundary
  - D019: Per-row sequential inserts with 23505 skip handler for recurring series creation — enables partial success on race conditions and fine-grained skippedDates reporting; a batch ON CONFLICT DO NOTHING would not reveal which rows were skipped
  - D020: New Stripe Customer per recurring booking at creation time; customer ID stored in recurring_schedules for cron auto-charge; deduplication deferred to a future milestone
  - D021: Dedicated /api/cron/recurring-charges route at 0 12 * * * (supersedes D013) — Vercel lifted per-project cron limit to 100 in Jan 2026, making the 'extend stripe-reminders' constraint obsolete; dedicated route is cleaner and independently schedulable
  - D022: Non-expiring 64-char hex cancel_token on recurring_schedules (randomBytes(32)) for token-gated /manage/[token] parent self-service; non-expiring because series span 6+ months; rate-limiting can be added if abuse detected
  - Token-gated self-service pages pattern: RSC shell resolves token, client component uses fetch() against /api/* routes — server actions require auth session which email-link visitors lack
  - Fire-and-forget email pattern: all email sends in try/catch, email delivery failure never fails the booking creation or cancellation operation
  - Two-layer idempotency for cron Stripe PIs: Stripe idempotencyKey (`recurring-charge-{bookingId}-{tomorrowUtc}`) + DB .eq('status','requested') guard on booking update
  - computeSessionAmount for recurring charges uses teacher hourly_rate — bookings table has no session_type_id FK (D008 deferred that column); known gap documented in S02 known limitations
key_files:
  - supabase/migrations/0014_recurring_schedules.sql
  - supabase/migrations/0015_payment_failed_status.sql
  - supabase/migrations/0016_cancel_token.sql
  - src/lib/utils/recurring.ts
  - src/lib/schemas/booking.ts
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/app/api/direct-booking/check-conflicts/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/manage/cancel-session/route.ts
  - src/app/api/manage/cancel-series/route.ts
  - src/components/profile/RecurringOptions.tsx
  - src/components/profile/BookingCalendar.tsx
  - src/components/dashboard/ConfirmedSessionCard.tsx
  - src/actions/bookings.ts
  - src/app/manage/[token]/page.tsx
  - src/app/manage/[token]/CancelSeriesForm.tsx
  - src/emails/RecurringBookingConfirmationEmail.tsx
  - src/emails/RecurringCancellationEmail.tsx
  - src/emails/RecurringPaymentFailedEmail.tsx
  - src/lib/email.ts
  - src/__tests__/recurring-dates.test.ts
  - src/__tests__/recurring-conflicts.test.ts
  - src/__tests__/create-recurring.test.ts
  - src/__tests__/webhook-capture.test.ts
  - src/__tests__/recurring-charges.test.ts
  - src/__tests__/cancel-recurring.test.ts
  - src/__tests__/manage-cancel.test.ts
  - vercel.json
  - vitest.config.ts
lessons_learned:
  - UTC noon anchor for date arithmetic: always anchor recurring date generation at T12:00:00Z, never midnight — DST transitions can shift midnight-anchored +7-day arithmetic by one day. A test crossing a DST boundary caught this during T01 development.
  - Partial success is the correct model for multi-row inserts: per-row sequential inserts with 23505 skip give callers exact visibility into which rows were skipped (race conditions, conflicts). Batch ON CONFLICT DO NOTHING is opaque about which rows failed.
  - Two-layer idempotency for cron Stripe operations: combine a Stripe idempotencyKey (tied to bookingId + date) with a DB .eq('status','requested') guard — this handles both duplicate cron invocations and retry scenarios without double-charging.
  - setup_future_usage:'off_session' + capture_method:'manual' on a single PaymentIntent simultaneously saves the card for future auto-charges and authorizes the first session — one PI, two purposes, no separate SetupIntent needed.
  - Token-gated email-link pages must use fetch() not server actions: server actions require an active Next.js session. Pages reached via email links have no session, so server actions silently fail. Always use dedicated /api/* routes for mutations on no-auth pages.
  - Mock @/lib/email in route test files: any test file that imports a route module which imports @/lib/email must add vi.mock('@/lib/email', ...) — otherwise the Resend constructor throws during module import, failing tests with a confusing error unrelated to the test subject.
  - Add .gsd/** to vitest excludes: stale .gsd worktree files from previous milestones can contain test files that pollute the test run and cause phantom failures in CI. Always exclude .gsd/** in vitest.config.ts.
  - Fire-and-forget email pattern for all notification sends: email delivery failure should never fail the core business operation (booking creation, charge, cancellation). Wrap all email sends in try/catch with console.error logging.
  - Vercel cron limits changed: as of Jan 2026, Vercel lifted the per-project cron limit to 100 on all plans. D013's constraint ('extend existing cron to stay within Hobby limits') is now obsolete — dedicated per-feature cron routes are preferred.
  - computeSessionAmount workaround: since bookings has no session_type_id FK (D008 deferred it), recurring charges must compute amount from teacher hourly_rate. Document this gap clearly so future session-type pricing work knows to add the FK and update the cron.
---

# M009: Recurring Sessions

**Delivered end-to-end recurring tutoring sessions: weekly/biweekly booking creation with conflict detection, per-session auto-charging via saved Stripe cards, and full teacher + parent cancellation flows — 67 tests passing, tsc clean, build green.**

## What Happened

M009 shipped the complete recurring sessions feature across three sequential slices, each building directly on the last.

**S01 — Schema & Recurring Booking Creation** established the full data and API foundation. Migration 0014 created the `recurring_schedules` table (UUID PK, frequency, total_sessions, Stripe Customer fields) and added `recurring_schedule_id` FK and `is_recurring_first` flag to bookings, with a partial index for efficient downstream lookups. Two utility functions — `generateRecurringDates` (UTC-noon-anchored for DST safety) and `checkDateConflicts` (async, optimistic on failure) — power all recurring date math. The `POST /api/direct-booking/create-recurring` route handles the full creation pipeline: validate → generate dates → check conflicts → insert schedule + booking rows (with 23505 skip for partial success on race conditions) → create Stripe Customer + PaymentIntent with `setup_future_usage:'off_session'` and `capture_method:'manual'` → fire confirmation email. The `RecurringOptions` UI component (frequency toggle, count slider, live projected dates with ✓/✗ conflict markers) was wired into `BookingCalendar` as a new 'recurring' step in the state machine. 25 tests validated all paths.

**S02 — Saved Cards & Auto-Charge Cron** built the payment backbone that makes recurring billing work beyond the first session. Migration 0015 added `payment_failed` to the bookings status CHECK constraint. The existing `payment_intent.amount_capturable_updated` webhook handler was extended to detect `recurring_schedule_id` in PI metadata and store `stripe_payment_method_id` on the linked schedule row (idempotency guard: `.is('stripe_payment_method_id', null)`, fire-and-forget on the DB update). The `/api/cron/recurring-charges` route (added to vercel.json at `0 12 * * *`) runs daily, finds all non-first recurring sessions with `status='requested'` for tomorrow, and creates off-session PIs from the saved payment method — with a two-layer idempotency mechanism (Stripe idempotencyKey + DB `.eq('status','requested')` guard) and fire-and-forget `RecurringPaymentFailedEmail` notifications on failure. Decision D021 formally supersedes D013 (the old "extend stripe-reminders" plan) now that Vercel lifted cron limits to 100 in Jan 2026. 16 tests validated all cron and webhook paths.

**S03 — Cancellation & Dashboard Series UX** completed the cancellation surface on all three planes. Migration 0016 added `cancel_token` (TEXT UNIQUE, 64-char hex via `randomBytes(32)`) to `recurring_schedules`, generated at booking creation time and embedded as a "Manage your series" link in the parent confirmation email. Two server actions — `cancelSingleRecurringSession` and `cancelRecurringSeries` — handle teacher-side cancellation: supabaseAdmin queries for ownership, non-blocking Stripe PI void, batch booking update, fire-and-forget `RecurringCancellationEmail`. The `ConfirmedSessionCard` gained an amber "Recurring" badge, a "Payment Failed" badge, and a "Cancel Series" button with confirm dialog. The `/manage/[token]` parent self-service page (RSC shell resolves token, `CancelSeriesForm` client component uses `fetch()` against token-gated `/api/manage/cancel-session` and `/api/manage/cancel-series` routes — no auth session required) lets parents cancel individual sessions or the full remaining series without contacting the teacher. 26 tests validated all cancellation paths.

## Success Criteria Results

## Success Criteria Results

All 6 success criteria confirmed met:

**1. Parent can select a recurring schedule (weekly/biweekly, N weeks) in the booking flow and see which dates were skipped due to conflicts**
✅ Met. `RecurringOptions.tsx` delivers a frequency toggle (One-time / Weekly / Biweekly), session count slider (2–26 weeks), and a live projected dates list with ✓/✗ conflict markers powered by the `check-conflicts` endpoint. The `BookingCalendar` state machine routes through the 'recurring' step for non-one-time frequencies. Evidence: S01 T03 summary; 8 conflict-detection unit tests pass.

**2. Individual booking rows are created per session, linked by recurring_schedule_id**
✅ Met. Migration 0014 adds `recurring_schedules` table and `bookings.recurring_schedule_id` FK. `create-recurring` route performs per-row sequential inserts with 23505 unique-constraint skip — returning `skippedDates` to the caller. Evidence: S01 T02; 9 create-recurring integration tests pass.

**3. First session is authorized via existing PaymentIntent flow; subsequent sessions are auto-charged 24h before via saved card**
✅ Met. S01 creates a PaymentIntent with `setup_future_usage:'off_session'` + `capture_method:'manual'` — the first session is authorized just like a one-time booking, while the PI also saves the card for future use. S02 webhook captures `stripe_payment_method_id` on PI confirmation; the daily cron creates off-session PIs from the saved card for all subsequent sessions. Evidence: S01 T02, S02 T01/T02; 9 create-recurring + 8 recurring-charges + 8 webhook-capture tests all pass.

**4. Teacher sees recurring sessions in dashboard with series badge and can cancel one or remaining series**
✅ Met. `ConfirmedSessionCard` shows an amber "Recurring" badge when `recurringScheduleId` is set, a "Payment Failed" badge when `status === 'payment_failed'`, and a "Cancel Series" button that calls `cancelRecurringSeries` with a confirm dialog. Evidence: S03 T02; 16 cancel-recurring tests pass.

**5. Parent can cancel individual sessions or remaining series via secure email link**
✅ Met. `cancel_token` (64-char hex) stored on `recurring_schedules` at booking creation; manageUrl embedded in `RecurringBookingConfirmationEmail` (parent variant only). `/manage/[token]` RSC page + `CancelSeriesForm` client component provides per-session and cancel-all-remaining functionality with no login required. Evidence: S03 T01/T03; 10 manage-cancel tests pass.

**6. Cron successfully charges saved cards for upcoming recurring sessions with failure handling and notifications**
✅ Met. `/api/cron/recurring-charges` (vercel.json: `0 12 * * *`) authenticates via CRON_SECRET, queries non-first recurring bookings for tomorrow, creates off-session PIs with idempotencyKey, updates to `confirmed` on success / `payment_failed` + email notification on Stripe error. Returns `{ charged, failed, skipped, checked }` JSON for monitoring. Evidence: S02 T02; 8 recurring-charges tests including mixed-results scenario pass.

## Definition of Done Results

## Definition of Done Results

- ✅ **All slices marked complete with summaries present:** S01 ✅ (S01-SUMMARY.md exists, verification_result: passed), S02 ✅ (S02-SUMMARY.md exists, verification_result: passed), S03 ✅ (S03-SUMMARY.md exists, verification_result: passed).
- ✅ **All slice task summaries present:** S01 has T01–T04 summaries. S02 has T01–T02 summaries. S03 has T01–T03 summaries. All accounted for.
- ✅ **67/67 tests pass** across 7 test files: recurring-dates (8), recurring-conflicts (8), create-recurring (9), webhook-capture (8), recurring-charges (8), cancel-recurring (16), manage-cancel (10). Verified live by running `npx vitest run` — all pass in 1.09s.
- ✅ **`tsc --noEmit` exits 0** — confirmed in each slice summary verification section.
- ✅ **`npm run build` succeeds** — all routes including `/api/cron/recurring-charges`, `/api/direct-booking/create-recurring`, `/api/direct-booking/check-conflicts`, `/api/manage/cancel-session`, `/api/manage/cancel-series`, and `/manage/[token]` confirmed in route manifest.
- ✅ **Cross-slice integration verified:** S01→S02 boundary (recurring_schedules.stripe_customer_id + is_recurring_first flag consumed by webhook + cron), S01→S03 boundary (recurring_schedule_id grouping consumed by cancellation server actions), S02→S03 boundary (payment_failed status consumed by ConfirmedSessionCard badges and dashboard query) — all wired correctly per M009-VALIDATION.md verdict: pass.
- ✅ **47 non-.gsd files changed** — `git diff --stat origin/main HEAD -- ':!.gsd/'` confirms real code was shipped, not just planning artifacts.
- ✅ **Milestone validation ran** — M009-VALIDATION.md recorded verdict: pass, remediation_round: 0 before milestone completion.

## Requirement Outcomes

## Requirement Status Transitions

All 9 RECUR requirements transition from **active → validated** with the following evidence:

| Requirement | Transition | Evidence |
|-------------|-----------|----------|
| RECUR-01 — Parent can set recurring schedule | active → **validated** | `RecurringOptions.tsx` frequency toggle + count slider in `BookingCalendar` 'recurring' step; 8 conflict-detection tests demonstrate real-time preview |
| RECUR-02 — System auto-creates future booking rows | active → **validated** | `recurring_schedules` table (migration 0014) + per-row inserts in `create-recurring` route; 9 integration tests verify booking row creation with correct recurring_schedule_id FK |
| RECUR-03 — Per-session payment handling | active → **validated** | Cron creates individual PI per booking row; `payment_failed` status on Stripe error; 8 recurring-charges tests cover all payment paths |
| RECUR-04 — Cancel individual/series | active → **validated** | `cancelSingleRecurringSession` + `cancelRecurringSeries` server actions + `/api/manage/cancel-session` + `/api/manage/cancel-series` routes; 26 tests cover both teacher and parent cancellation paths |
| RECUR-05 — Availability + double-booking prevention | active → **validated** | `checkDateConflicts` with unique constraint fallback; 8 conflict-detection unit tests including booking conflict, override precedence, and all-skipped scenarios |
| RECUR-06 — Saved card via Stripe Customer + SetupIntent | active → **validated** | `create-recurring` creates Stripe Customer + PI with `setup_future_usage:'off_session'`; webhook stores `stripe_payment_method_id` on confirmation; 9 create-recurring + 8 webhook-capture tests |
| RECUR-07 — Cron charges upcoming recurring sessions 24h before | active → **validated** | `/api/cron/recurring-charges` in vercel.json at `0 12 * * *`; 8 recurring-charges tests including idempotency, fee calculation, mixed results. Note: D021 supersedes original plan to extend stripe-reminders — dedicated route used instead |
| RECUR-08 — Parent self-service cancellation via secure link | active → **validated** | `cancel_token` (migration 0016) + `/manage/[token]` RSC page + `/api/manage/*` token-gated routes; 10 manage-cancel tests covering all edge cases including invalid tokens and ownership mismatches |
| RECUR-09 — Recurring sessions in dashboard with series badge | active → **validated** | `ConfirmedSessionCard` Recurring amber badge + Payment Failed badge + Cancel Series button; sessions page query extended for recurring_schedule_id and payment_failed status |

## Deviations

- RECUR-07 originally specified extending the existing /api/cron/stripe-reminders route (per D013). Instead, a dedicated /api/cron/recurring-charges route was created (D021) because Vercel lifted cron limits to 100 in Jan 2026, making the original constraint obsolete. The dedicated route is cleaner and independently schedulable.
- Stripe Customer deduplication was deferred (D020) — each recurring booking creates a new Stripe Customer. No email-based lookup for existing customers.
- session_type_id FK not added to bookings table — recurring charges use computeSessionAmount(start_time, end_time, hourly_rate) instead of session type price. D008 deferred this column and it remains deferred.
- cancel_token is non-expiring — series can span 6+ months and expiring tokens would lock parents out. Rate-limiting is the planned mitigation if abuse is detected (D022).

## Follow-ups

- Add session_type_id FK to bookings table (migration 0016+) and update recurring-charges cron to use session type price when available — current gap documented in S02 known limitations.
- Stripe Customer deduplication by parent email — current implementation creates one Customer per recurring booking. Could reuse existing Customer via stripe.customers.list({ email }) lookup in a future milestone.
- Add rate-limiting middleware to /api/manage/* routes if token abuse is detected in production logs (noted in D022 as optional follow-up).
- Add cancel-series preview modal to ConfirmedSessionCard showing the list of sessions to be cancelled before the teacher confirms — currently shows a simple confirm dialog.
- Consider debouncing the check-conflicts API call in RecurringOptions.tsx if UX feels slow on high-latency connections — currently fires on every frequency/count change.
