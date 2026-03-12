---
id: T02
parent: S04
milestone: M001
provides:
  - POST /api/direct-booking/create-intent — creates booking row + Stripe PaymentIntent, returns clientSecret
  - InlineAuthForm component — inline Supabase auth step for booking flow without page redirect
  - PaymentStep component — Stripe Elements wrapper with PaymentElement + Confirm & Pay
  - BookingCalendar extended with stripeConnected prop and auth/payment steps
  - Webhook handler for payment_intent.amount_capturable_updated — confirms booking on authorization
  - BookingConfirmationEmail updated with optional accountUrl prop for parent /account discoverability
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 45min
verification_result: passed
completed_at: 2026-03-09
blocker_discovered: false
---
# T02: 04-direct-booking-parent-account 02

**# Phase 4 Plan 02: Direct Booking Flow Summary**

## What Happened

# Phase 4 Plan 02: Direct Booking Flow Summary

**Inline Stripe Elements payment flow for Stripe-connected teachers: auth step + PaymentIntent creation + webhook confirmation + parent /account email discoverability**

## Performance

- **Duration:** ~45 min (across multiple sessions including prior fix commits)
- **Started:** 2026-03-08
- **Completed:** 2026-03-09
- **Tasks:** 2 (+ checkpoint)
- **Files modified:** 11

## Accomplishments

- End-to-end direct booking path: slot selection → inline auth → PaymentElement → inline success state
- BookingCalendar detects Stripe-connected teachers and routes through auth + payment steps (deferred path unchanged)
- Webhook confirms bookings via payment_intent.amount_capturable_updated with idempotency guard
- Booking confirmation email includes /account link for parent discoverability (PARENT-02)
- 21 tests pass covering all BOOK-05 and PARENT-01 behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: create-intent API route + InlineAuthForm** - `9faf4af` (feat)
2. **Task 2: PaymentStep + BookingCalendar + webhook + slug page + email** - `6651ae3` (feat)
3. **Fix: null hourly_rate guard + payment error messages** - `43af62a` (fix)
4. **Fix: loadStripe stripeAccount exploration** - `377240a`, `1ef8030`, `0456621` (fix)
5. **Fix: switch to destination charges without on_behalf_of** - `b58fe77` (fix)
6. **Fix: align payment-intent test with destination charges** - `61d4b23` (fix)

## Files Created/Modified

- `src/app/api/direct-booking/create-intent/route.ts` — POST endpoint: auth check, booking insert, Stripe PI creation, clientSecret response
- `src/components/auth/InlineAuthForm.tsx` — Inline Supabase auth (email/password + Google OAuth) without Server Action redirect
- `src/components/profile/PaymentStep.tsx` — Stripe Elements wrapper with module-level loadStripe, confirmPayment with redirect:'if_required'
- `src/components/profile/BookingCalendar.tsx` — Extended with stripeConnected prop, auth + payment step branches
- `src/app/api/stripe/webhook/route.ts` — Added payment_intent.amount_capturable_updated case with idempotency guard
- `src/app/[slug]/page.tsx` — Passes stripeConnected + teacherStripeAccountId props to BookingCalendar
- `src/emails/BookingConfirmationEmail.tsx` — Added optional accountUrl prop for parent /account link
- `src/lib/email.ts` — sendBookingConfirmationEmail accepts options.accountUrl, passes to parent email only
- `src/__tests__/booking-routing.test.ts` — 6 tests covering create-intent route behaviors
- `src/__tests__/parent-auth.test.tsx` — 5 RTL tests for InlineAuthForm
- `src/__tests__/payment-intent.test.ts` — 5 tests for PaymentIntent creation behaviors
- `src/__tests__/webhook-capture.test.ts` — 5 tests for amount_capturable_updated webhook

## Decisions Made

- **Destination charges without on_behalf_of**: The initial implementation used `on_behalf_of` but Stripe returned errors. Switched to platform-side PaymentIntent with `transfer_data.destination` only. This is the correct pattern for platform-initiated destination charges where the PI lives on the platform account.
- **Orphan booking cleanup**: If Stripe PI creation fails after the booking row is inserted, the route deletes the orphan booking row so the time slot is not permanently blocked for the parent.
- **Google OAuth accepted limitation**: Redirects away from the booking page — booking form state is lost. Documented in code comment. MVP tradeoff.
- **accountUrl parent-only**: Only the parent-facing confirmation email receives the /account link. Teacher email omits it (teacher uses /dashboard).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test asserting on_behalf_of after implementation removed it**
- **Found during:** Task 2 verification (running tests)
- **Issue:** payment-intent.test.ts asserted `on_behalf_of: STRIPE_ACCOUNT_ID` but the implementation was deliberately changed (commit b58fe77) to use destination charges without on_behalf_of
- **Fix:** Updated test name and expectation to assert only `transfer_data.destination` is set; added comment explaining the architectural decision
- **Files modified:** src/__tests__/payment-intent.test.ts
- **Verification:** All 21 tests pass after fix
- **Committed in:** 61d4b23

**2. [Rule 3 - Blocking] onBookAnother prop missing from PaymentStep call in BookingCalendar**
- **Found during:** Task 2 implementation (TypeScript check)
- **Issue:** PaymentStep interface required onBookAnother but BookingCalendar wasn't passing it
- **Fix:** Added onBookAnother={handleBookAnother} to PaymentStep usage in BookingCalendar
- **Files modified:** src/components/profile/BookingCalendar.tsx
- **Verification:** TypeScript passes (npx tsc --noEmit)
- **Committed in:** 61d4b23

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both fixes essential for tests to pass and TypeScript to compile. No scope creep.

## Issues Encountered

- Stripe destination charges with on_behalf_of caused errors in the connected account context — resolved by switching to platform-side PaymentIntent pattern (destination charges without on_behalf_of). Multiple fix commits document the exploration.

## User Setup Required

None — no new external service configuration required beyond what was set up in Phase 3.

## Next Phase Readiness

- Direct booking path complete and tested
- Parent /account discoverability email path live (PARENT-02)
- Ready for Phase 4 Plan 03: parent account page that lists session history

---
*Phase: 04-direct-booking-parent-account*
*Completed: 2026-03-09*
