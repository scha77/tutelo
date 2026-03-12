# S03: Stripe Connect Deferred Payment

**Goal:** Install the Stripe SDK, build the /dashboard/connect-stripe page with a single "Connect with Stripe" Server Action, and wire both webhook endpoints (platform + connected-account).
**Demo:** Install the Stripe SDK, build the /dashboard/connect-stripe page with a single "Connect with Stripe" Server Action, and wire both webhook endpoints (platform + connected-account).

## Must-Haves


## Tasks

- [x] **T01: 03-stripe-connect-deferred-payment 01**
  - Install the Stripe SDK, build the /dashboard/connect-stripe page with a single "Connect with Stripe" Server Action, and wire both webhook endpoints (platform + connected-account).

Purpose: Establishes the Stripe infrastructure backbone. The connect page is the destination teachers land on from the "money waiting" email CTA. The platform webhook is where all Stripe events arrive — account activation, payment completion.

Output: Working connect page, connectStripe Server Action, two webhook route handlers, test scaffold.
- [x] **T02: 03-stripe-connect-deferred-payment 02**
  - Implement the full deferred payment flow: when a teacher activates Stripe, create Checkout sessions for all waiting bookings and email parents; wire checkout.session.completed to confirm bookings; add 48hr auto-cancel cron and 24hr/48hr follow-up email cron; create FollowUpEmail and UrgentFollowUpEmail templates.

Purpose: This is the core revenue mechanism. Without it, teachers connecting Stripe produces no result for waiting parents, and unresolved requests stack up forever.

Output: DB migration, complete platform webhook handlers, two cron routes, two email templates, vercel.json, test scaffolds.
- [x] **T03: 03-stripe-connect-deferred-payment 03** `est:6min`
  - Complete the revenue path: add markSessionComplete Server Action with Stripe payment capture and 7% fee, add the Confirmed section to the requests page, build the /booking-confirmed landing page, and implement all four remaining email templates (NOTIF-03, NOTIF-05, NOTIF-06) with their dispatch functions in email.ts.

Purpose: This closes the loop from booking request to payment captured. After this plan, a teacher can connect Stripe, parents can authorize payment, and marking a session complete triggers the final capture and sends the parent a review prompt.

Output: markSessionComplete Server Action, Confirmed section UI, /booking-confirmed page, 3 email templates, 4 test scaffolds.
- [x] **T04: 03-stripe-connect-deferred-payment 04** `est:5min`
  - Fix the Supabase JS v2 `count` bug in the auto-cancel cron that silently prevents cancellation emails from ever being sent.

Purpose: STRIPE-04 and NOTIF-05 are currently partial — the DB update to `cancelled` works correctly but the email notification is never dispatched. The root cause is that Supabase JS v2 `.update()` returns `count: null` unless an explicit count preference header is sent. The idempotency guard `if (count && count > 0)` is always false, so `sendCancellationEmail` is never called.

Output: `src/app/api/cron/auto-cancel/route.ts` with `.select('id')` chained to the update and the guard rewritten to check `updated && updated.length > 0`.

## Files Likely Touched

- `package.json`
- `src/app/(dashboard)/dashboard/connect-stripe/page.tsx`
- `src/actions/stripe.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/stripe-connect/webhook/route.ts`
- `tests/stripe/connect-stripe.test.ts`
- `supabase/migrations/0004_stripe_checkout_url.sql`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/cron/auto-cancel/route.ts`
- `src/app/api/cron/stripe-reminders/route.ts`
- `src/lib/email.ts`
- `src/emails/FollowUpEmail.tsx`
- `src/emails/UrgentFollowUpEmail.tsx`
- `vercel.json`
- `tests/stripe/checkout-session.test.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `src/actions/bookings.ts`
- `src/app/(dashboard)/dashboard/requests/page.tsx`
- `src/app/booking-confirmed/page.tsx`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/email.ts`
- `src/emails/BookingConfirmationEmail.tsx`
- `src/emails/CancellationEmail.tsx`
- `src/emails/SessionCompleteEmail.tsx`
- `tests/stripe/mark-complete.test.ts`
- `tests/stripe/email-confirmation.test.ts`
- `tests/stripe/email-cancellation.test.ts`
- `tests/stripe/email-complete.test.ts`
- `src/app/api/cron/auto-cancel/route.ts`
