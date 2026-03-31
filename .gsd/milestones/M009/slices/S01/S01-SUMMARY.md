---
id: S01
parent: M009
milestone: M009
provides:
  - recurring_schedules table and bookings.recurring_schedule_id FK — S02 reads recurring_schedules.stripe_customer_id to find the Stripe Customer for auto-charge
  - generateRecurringDates + checkDateConflicts utilities in src/lib/utils/recurring.ts — S02/S03 can import these directly
  - POST /api/direct-booking/create-recurring — creates recurring schedule, individual booking rows, Stripe Customer, and PaymentIntent with setup_future_usage
  - recurring_schedules.is_recurring_first flag — S02 uses this to identify which booking is already authorized vs. which need auto-charge
  - BookingCalendar 'recurring' step state machine — S03 cancel flow attaches to existing booking rows linked by recurring_schedule_id
requires:
  []
affects:
  - S02 — depends on recurring_schedules.stripe_customer_id and booking rows with recurring_schedule_id to implement auto-charge cron
  - S03 — depends on recurring_schedule_id grouping and is_recurring_first flag for cancellation UI
key_files:
  - supabase/migrations/0014_recurring_schedules.sql
  - src/lib/utils/recurring.ts
  - src/__tests__/recurring-dates.test.ts
  - src/__tests__/recurring-conflicts.test.ts
  - src/lib/schemas/booking.ts
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/__tests__/create-recurring.test.ts
  - src/components/profile/RecurringOptions.tsx
  - src/app/api/direct-booking/check-conflicts/route.ts
  - src/components/profile/BookingCalendar.tsx
  - src/emails/RecurringBookingConfirmationEmail.tsx
  - src/lib/email.ts
key_decisions:
  - UTC noon anchor for date arithmetic to avoid DST edge cases in generateRecurringDates
  - Per-row sequential booking inserts with 23505 skip — allows partial success on race conditions
  - New Stripe Customer per recurring booking; customer ID stored in recurring_schedules for S02 auto-charge
  - PaymentIntent with setup_future_usage:'off_session' + capture_method:'manual' — single confirmation saves card and authorizes first session simultaneously
  - Optimistic fallback on conflict-check failure — unique constraint provides final safety net
  - Separate read-only check-conflicts endpoint for UI preview; create-recurring re-checks at insert time for race conditions
  - Email sending is fire-and-forget; booking creation never fails due to email delivery failure
patterns_established:
  - Recurring date generation: generateRecurringDates(startDate, frequency, count) → YYYY-MM-DD[] using UTC noon anchor — use this for all recurring date arithmetic
  - Conflict check split: lightweight check-conflicts endpoint for UI preview + re-check at insert time in create-recurring for race-condition safety
  - Recurring API route cleanup pattern: on Stripe failure, delete all booking rows + schedule row in reverse order before returning 502
  - Mock pattern for route tests that import @/lib/email: vi.mock('@/lib/email', ...) must be added to prevent Resend constructor error during module import
  - React Email Preview with number interpolation: use template literal, not JSX expression — direct number children cause TS2322
observability_surfaces:
  - Stripe cleanup logs console.error('[create-recurring] Stripe operation failed:', error) before returning 502
  - Email send failure logs console.error('[create-recurring] Failed to send confirmation email:', error) without failing the booking
  - checkDateConflicts logs console.error('[checkDateConflicts] Booking conflict query failed:', error) and returns optimistic on query failure
drill_down_paths:
  - .gsd/milestones/M009/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M009/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M009/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M009/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:04:41.256Z
blocker_discovered: false
---

# S01: Schema & Recurring Booking Creation

**Full recurring booking creation stack: SQL migration, pure utility functions (generateRecurringDates / checkDateConflicts), POST /api/direct-booking/create-recurring route with Stripe setup_future_usage, RecurringOptions UI component wired into BookingCalendar, and React Email confirmation template — 25 tests all passing, tsc clean, production build green.**

## What Happened

S01 delivered the complete foundation for recurring tutoring sessions across four tasks spanning database schema, server logic, frontend UI, and email notifications.

**T01 — Schema & Utility Functions**
Created `supabase/migrations/0014_recurring_schedules.sql` with the `recurring_schedules` table (UUID PK, teacher_id FK, parent_id FK nullable, parent_email, frequency CHECK IN (weekly/biweekly), total_sessions SMALLINT CHECK 2–26, start_date/start_time/end_time, stripe_customer_id, stripe_payment_method_id, created_at). Added `recurring_schedule_id UUID FK` and `is_recurring_first BOOLEAN DEFAULT FALSE` columns to bookings, with a partial index `WHERE recurring_schedule_id IS NOT NULL` for efficient S02/S03 lookups. RLS policies follow existing patterns.

Implemented `src/lib/utils/recurring.ts` with two exported functions: `generateRecurringDates` (pure, UTC-noon-anchored for DST safety, +7 or +14 days per session) and `checkDateConflicts` (async, queries bookings for non-cancelled slot conflicts, applies override-wins-recurring precedence consistent with client-side getSlotsForDate, optimistic on query failure with unique constraint as fallback). 16 unit tests cover date generation (weekly, biweekly, min/max count, month/year boundaries) and conflict detection (booking conflict, no availability, override block, override allow, all clear, all skipped, mixed).

**T02 — API Route**
Added `RecurringBookingSchema` to `src/lib/schemas/booking.ts` (teacherId, bookingDate, startTime, endTime, studentName, subject, notes, parentPhone, parentSmsOptIn, sessionTypeId, frequency, totalSessions). Created `src/app/api/direct-booking/create-recurring/route.ts` implementing the full booking-creation pipeline: authenticate parent → validate with Zod → fetch teacher (verify stripe_charges_enabled) → compute per-session amount (session type price OR hourly rate proration) → generateRecurringDates → checkDateConflicts → guard 0-available-dates → insert recurring_schedules row → per-row booking inserts with 23505 skip → create Stripe Customer → create PaymentIntent with setup_future_usage:'off_session' + capture_method:'manual' + transfer_data + application_fee → update recurring_schedules with customer ID → return clientSecret + sessionDates + skippedDates + totalCreated. Full cleanup on Stripe failure (delete bookings + schedule row, return 502). 9 integration tests using vi.hoisted MockStripeClass pattern.

**T03 — Frontend UI**
Added read-only `POST /api/direct-booking/check-conflicts/route.ts` (auth required, Zod-validated, calls checkDateConflicts, no mutations). Created `src/components/profile/RecurringOptions.tsx` with frequency toggle (One-time / Weekly / Biweekly), session count slider (2–26), live projected dates list with ✓/✗ conflict markers, end date display, and session summary. Wired into `src/components/profile/BookingCalendar.tsx` as a new 'recurring' step in the state machine between 'form' and 'auth'/'payment'. `onConfirm` routes to existing createPaymentIntent (frequency='one-time') or new createRecurringIntent (frequency='weekly'/'biweekly'). One-time and deferred booking paths are completely unchanged. Success view shows recurring session dates and skipped count when recurringData is set.

**T04 — Email Notifications**
Created `src/emails/RecurringBookingConfirmationEmail.tsx` (React Email components: greeting, N-session summary, numbered date list formatted as 'Tuesday, April 7, 2026 at 4:00 PM', amber-highlighted skipped-dates section, auto-payment note for parents, optional account link, teacher variant omits payment details). Added `sendRecurringBookingConfirmationEmail` to `src/lib/email.ts` following the centralized email pattern. Wired fire-and-forget sending into create-recurring route (try/catch, email failure never fails the booking). Updated teacher query to include full_name and social_email. Updated test mocks to include @/lib/email mock preventing Resend constructor errors.

## Verification

All slice verification checks passed:
1. `npx vitest run recurring-dates recurring-conflicts create-recurring --reporter=verbose` → 25/25 tests pass (8 date generation, 8 conflict detection, 9 create-recurring integration)
2. `npx tsc --noEmit` → 0 type errors
3. `npm run build` → Production build succeeds; `/api/direct-booking/check-conflicts` and `/api/direct-booking/create-recurring` both appear in route manifest

## Requirements Advanced

- DIR-01 — No impact — S01 is orthogonal to directory features

## Requirements Validated

None.

## New Requirements Surfaced

- S02 needs to store stripe_payment_method_id on recurring_schedules after parent confirms payment — currently NULL after S01
- S03 will need to handle cancellation of the is_recurring_first booking differently (it has an active PI authorization that must be cancelled on Stripe)

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All tasks delivered exactly as planned. T04 added full_name and social_email to the teacher select query (discovered during email wiring) and used a template literal for React Email Preview text to resolve TypeScript number interpolation — both minor, non-breaking deviations.

## Known Limitations

1. Stripe Customer is created fresh per recurring booking; no deduplication by email. Customer reuse can be added when S02 matures. 2. check-conflicts endpoint is called on every frequency/count change in RecurringOptions — could be debounced if UX feels slow on slow connections. 3. stripe_payment_method_id on recurring_schedules is populated by S02 (after parent confirms payment) — it is NULL after S01 create-recurring completes.

## Follow-ups

S02 must retrieve stripe_customer_id from recurring_schedules and the saved payment method from the confirmed PaymentIntent to implement auto-charge. The payment_method is attached to the Stripe Customer after confirmCardPayment — S02 should fetch it via stripe.customers.listPaymentMethods(customerId) or from the PI's payment_method field and store it on recurring_schedules.stripe_payment_method_id.

## Files Created/Modified

- `supabase/migrations/0014_recurring_schedules.sql` — New migration: recurring_schedules table + bookings.recurring_schedule_id FK + bookings.is_recurring_first column + partial index
- `src/lib/utils/recurring.ts` — New: generateRecurringDates and checkDateConflicts utility functions
- `src/__tests__/recurring-dates.test.ts` — New: 8 unit tests for generateRecurringDates
- `src/__tests__/recurring-conflicts.test.ts` — New: 8 unit tests for checkDateConflicts
- `src/lib/schemas/booking.ts` — Added RecurringBookingSchema (frequency, totalSessions + all booking fields)
- `src/app/api/direct-booking/create-recurring/route.ts` — New: POST route for recurring booking creation with Stripe Customer + PaymentIntent + email
- `src/__tests__/create-recurring.test.ts` — New: 9 integration tests for create-recurring route
- `src/components/profile/RecurringOptions.tsx` — New: frequency toggle + count slider + projected dates UI component
- `src/app/api/direct-booking/check-conflicts/route.ts` — New: read-only POST endpoint for conflict pre-check in RecurringOptions
- `src/components/profile/BookingCalendar.tsx` — Added 'recurring' step, recurringData state, createRecurringIntent, recurring success view
- `src/emails/RecurringBookingConfirmationEmail.tsx` — New: React Email template for recurring booking confirmation (parent + teacher variants)
- `src/lib/email.ts` — Added sendRecurringBookingConfirmationEmail centralized email function
