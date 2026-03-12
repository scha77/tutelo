# T02: 04-direct-booking-parent-account 02

**Slice:** S04 — **Milestone:** M001

## Description

Build the complete direct booking flow: the `create-intent` API route that creates a PaymentIntent and booking row, the `InlineAuthForm` and `PaymentStep` components, the BookingCalendar extension with `'auth'` and `'payment'` steps, the webhook handler extension for `payment_intent.amount_capturable_updated`, the `[slug]/page.tsx` prop update, and the `BookingConfirmationEmail` update with an `/account` link for parents. Implements BOOK-05, PARENT-01, and the PARENT-02 email discoverability path.

Purpose: When a teacher has Stripe connected, parents go from slot selection through auth to Stripe Elements payment in one inline flow — no redirect, no separate checkout page. After payment, the confirmation email gives parents the `/account` link so they can find their session history.
Output: End-to-end direct booking path live. Deferred path (Phase 3) untouched for teachers without Stripe. Confirmation email includes /account link for parents.

## Must-Haves

- [ ] "When stripe_charges_enabled = true, BookingCalendar shows 'auth' step after form details"
- [ ] "When stripe_charges_enabled = false, BookingCalendar behaves identically to Phase 3 (deferred path, no regression)"
- [ ] "Authenticated parent with active session skips auth step and goes directly to payment"
- [ ] "PaymentElement renders inline inside the booking card; no page redirect for card payments"
- [ ] "Clicking Confirm & Pay shows spinner while processing; inline success state on authorized payment"
- [ ] "payment_intent.amount_capturable_updated webhook confirms the booking row (status: confirmed)"
- [ ] "Booking created in DB before clientSecret returned (parent_id set, status: requested)"
- [ ] "Booking confirmation email sent to parent includes a link to /account so parents can find their session history"

## Files

- `src/app/api/direct-booking/create-intent/route.ts`
- `src/components/auth/InlineAuthForm.tsx`
- `src/components/profile/PaymentStep.tsx`
- `src/components/profile/BookingCalendar.tsx`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/[slug]/page.tsx`
- `src/emails/BookingConfirmationEmail.tsx`
- `src/__tests__/booking-routing.test.ts`
- `src/__tests__/payment-intent.test.ts`
- `src/__tests__/webhook-capture.test.ts`
- `src/__tests__/parent-auth.test.ts`
