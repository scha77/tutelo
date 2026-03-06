---
phase: 03-stripe-connect-deferred-payment
plan: 03
subsystem: payments
tags: [stripe, resend, react-email, server-actions, next-app-router]

# Dependency graph
requires:
  - phase: 03-stripe-connect-deferred-payment
    provides: "Stripe Connect Express setup, Checkout session creation, auto-cancel cron, deferred PaymentIntent"
  - phase: 02-booking-requests
    provides: "Booking state machine, requests page, acceptBooking/declineBooking Server Actions"
provides:
  - markSessionComplete Server Action — captures PaymentIntent with 7% application_fee_amount (STRIPE-07)
  - Confirmed Sessions section on /dashboard/requests — Mark Complete button per confirmed booking
  - /booking-confirmed public page — async searchParams receipt showing booking details
  - BookingConfirmationEmail.tsx — NOTIF-03 dual-recipient with isTeacher flag
  - CancellationEmail.tsx — NOTIF-05 empathetic cancellation for parent and teacher
  - SessionCompleteEmail.tsx — NOTIF-06 session-complete with Leave a Review CTA
  - email.ts: sendBookingConfirmationEmail, sendCancellationEmail (full impl replacing stub), sendSessionCompleteEmail
  - webhook: checkout.session.completed now calls sendBookingConfirmationEmail (stub replaced)
affects:
  - 04-direct-booking-parent-account (parent email flows, review URL stub)
  - 05-dashboard-reviews (review URL /review?booking=... used as stub in SessionCompleteEmail)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "supabaseAdmin (service role) for all email functions — required for webhook context where no user session exists"
    - "cast `data.teachers as unknown as { full_name: string }` — Supabase join returns inferred array type, needs double cast for correct narrowing"
    - "fire-and-forget email dispatch in markSessionComplete — sendSessionCompleteEmail(id).catch(console.error)"
    - "async searchParams: Promise<{ session?: string }> — Next.js 16 dynamic API pattern for public pages"
    - "top-level Stripe import in Server Action — server-only context, no browser bundle concern"

key-files:
  created:
    - src/emails/BookingConfirmationEmail.tsx
    - src/emails/CancellationEmail.tsx
    - src/emails/SessionCompleteEmail.tsx
    - src/components/dashboard/ConfirmedSessionCard.tsx
    - src/app/booking-confirmed/page.tsx
    - tests/stripe/mark-complete.test.ts
    - tests/stripe/email-confirmation.test.ts
    - tests/stripe/email-cancellation.test.ts
    - tests/stripe/email-complete.test.ts
  modified:
    - src/lib/email.ts
    - src/actions/bookings.ts
    - src/app/(dashboard)/dashboard/requests/page.tsx
    - src/app/api/stripe/webhook/route.ts
    - tests/bookings/email.test.ts

key-decisions:
  - "supabaseAdmin used in all three new email functions — not createClient() — because these are called from webhook handlers with no user session"
  - "fire-and-forget sendSessionCompleteEmail in markSessionComplete — avoids blocking capture response on email delivery"
  - "Confirmed Sessions section only rendered when confirmedBookings.length > 0 — clean empty state preserved"
  - "booking-confirmed page falls through to generic 'Your booking is confirmed' if Stripe session retrieval fails — resilient to session expiry"
  - "review URL stub /review?booking=bookingId in SessionCompleteEmail — Phase 5 implements actual review flow; link included so parent can find it after launch"

patterns-established:
  - "Pattern: Supabase join type cast — use `as unknown as TargetType` to convert inferred array union to single object type"
  - "Pattern: Email functions take only bookingId and fetch all data internally using supabaseAdmin — clean interface, no prop drilling"

requirements-completed: [STRIPE-06, STRIPE-07, NOTIF-03, NOTIF-05, NOTIF-06]

# Metrics
duration: 6min
completed: 2026-03-06
---

# Phase 3 Plan 3: Mark Complete + Email Templates + Booking Confirmed Page Summary

**markSessionComplete Server Action with 7% Stripe capture fee, three react-email templates (NOTIF-03/05/06), Confirmed Sessions section on dashboard, and /booking-confirmed receipt page — completing the full revenue path from booking request to payment captured**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-06T17:36:44Z
- **Completed:** 2026-03-06T17:42:29Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- markSessionComplete Server Action: retrieves PaymentIntent, captures with 7% application_fee_amount (STRIPE-07), updates booking to `completed`, fires session-complete email
- Three react-email templates: BookingConfirmationEmail (dual-recipient with isTeacher flag), CancellationEmail (empathetic for both parties), SessionCompleteEmail (review prompt CTA)
- Confirmed Sessions section on /dashboard/requests: ConfirmedSessionCard with Mark Complete button, card disappears after capture via revalidatePath
- /booking-confirmed public landing page: reads ?session=cs_xxx, retrieves Checkout Session from Stripe, shows booking details receipt-style with async searchParams (Next.js 16 pattern)
- webhook checkout.session.completed handler wired to sendBookingConfirmationEmail (TODO stub replaced)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — test scaffolds** - `3ad053b` (test)
2. **Task 2: Email templates + email.ts functions + markSessionComplete + webhook** - `36ee65a` (feat)
3. **Task 3: Confirmed section + /booking-confirmed page** - `4794ec8` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/emails/BookingConfirmationEmail.tsx` — NOTIF-03 dual-recipient booking confirmation with isTeacher flag
- `src/emails/CancellationEmail.tsx` — NOTIF-05 cancellation for parent and teacher
- `src/emails/SessionCompleteEmail.tsx` — NOTIF-06 session-complete with Leave a Review CTA linking to /review?booking=
- `src/components/dashboard/ConfirmedSessionCard.tsx` — client component with Mark Complete button and pending state
- `src/app/booking-confirmed/page.tsx` — public receipt page with async searchParams, graceful fallback if session retrieval fails
- `src/lib/email.ts` — added supabaseAdmin import; replaced sendCancellationEmail stub; added sendBookingConfirmationEmail + sendSessionCompleteEmail
- `src/actions/bookings.ts` — added markSessionComplete Server Action with Stripe capture + 7% fee
- `src/app/(dashboard)/dashboard/requests/page.tsx` — added confirmed bookings query + Confirmed Sessions section below Pending
- `src/app/api/stripe/webhook/route.ts` — replaced TODO stub with sendBookingConfirmationEmail call
- `tests/bookings/email.test.ts` — added supabaseAdmin mock (regression fix)
- `tests/stripe/mark-complete.test.ts` — 6 todos for markSessionComplete behavior
- `tests/stripe/email-confirmation.test.ts` — 3 todos for NOTIF-03 dual-recipient
- `tests/stripe/email-cancellation.test.ts` — 2 todos for NOTIF-05 both parties
- `tests/stripe/email-complete.test.ts` — 3 todos for NOTIF-06 review prompt

## Decisions Made

- `supabaseAdmin` used in all three email functions (not `createClient()`) — required for webhook context where no user session exists
- fire-and-forget pattern for `sendSessionCompleteEmail` in `markSessionComplete` — avoids blocking payment capture response on email delivery latency
- Confirmed Sessions section conditionally rendered only when `confirmedBookings.length > 0` — preserves clean empty state when no confirmed sessions
- `/booking-confirmed` page falls through to generic confirmation if Stripe session retrieval fails — resilient to Checkout Session expiry or missing metadata
- review URL stub `/review?booking=bookingId` in SessionCompleteEmail — link included so parent has it once Phase 5 ships the actual review flow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tests/bookings/email.test.ts regression caused by new supabaseAdmin import**
- **Found during:** Task 3 (full regression test run)
- **Issue:** Adding `import { supabaseAdmin } from '@/lib/supabase/service'` to `email.ts` caused `email.test.ts` to fail with "supabaseUrl is required" — the test mocked `@/lib/supabase/server` but not `@/lib/supabase/service`, so `supabaseAdmin` initialized with undefined URL
- **Fix:** Added `vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))` to `tests/bookings/email.test.ts`
- **Files modified:** `tests/bookings/email.test.ts`
- **Verification:** All 3 tests in `email.test.ts` pass; full suite passes
- **Committed in:** `4794ec8` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary correctness fix — new module-level import in email.ts required the pre-existing test to declare the mock. No scope creep.

## Issues Encountered

- TypeScript error on Supabase join type narrowing: `data.teachers as { full_name: string }` fails because Supabase infers the type as an array union. Fixed by casting via `unknown` first: `data.teachers as unknown as { full_name: string }`. This is the same pattern used in the webhook handler from Plan 02.

## User Setup Required

None — no external service configuration required. All functionality uses environment variables already configured in Phase 3 Plans 01-02.

## Next Phase Readiness

- Revenue path is complete: teacher connects Stripe → parent authorizes → teacher marks complete → payment captured at 7% fee
- All three email notification types implemented (confirmation, cancellation, session-complete)
- Phase 4 (Direct Booking + Parent Account) can build on this foundation
- Review stub URL `/review?booking=bookingId` embedded in SessionCompleteEmail — Phase 5 just needs to implement the route

---
*Phase: 03-stripe-connect-deferred-payment*
*Completed: 2026-03-06*
