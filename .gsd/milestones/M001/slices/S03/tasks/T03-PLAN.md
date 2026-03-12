# T03: 03-stripe-connect-deferred-payment 03

**Slice:** S03 — **Milestone:** M001

## Description

Complete the revenue path: add markSessionComplete Server Action with Stripe payment capture and 7% fee, add the Confirmed section to the requests page, build the /booking-confirmed landing page, and implement all four remaining email templates (NOTIF-03, NOTIF-05, NOTIF-06) with their dispatch functions in email.ts.

Purpose: This closes the loop from booking request to payment captured. After this plan, a teacher can connect Stripe, parents can authorize payment, and marking a session complete triggers the final capture and sends the parent a review prompt.

Output: markSessionComplete Server Action, Confirmed section UI, /booking-confirmed page, 3 email templates, 4 test scaffolds.

## Must-Haves

- [ ] "Teacher can see confirmed sessions in a Confirmed section below pending requests on /dashboard/requests"
- [ ] "Clicking Mark Complete on a confirmed booking triggers payment capture with a 7% application fee"
- [ ] "After marking complete, the booking card disappears from the Confirmed section immediately"
- [ ] "Parent receives a session-complete email with a review prompt after Mark Complete"
- [ ] "Both teacher and parent receive booking confirmation emails when Checkout is completed"
- [ ] "Both teacher and parent receive cancellation emails when a booking is auto-cancelled"
- [ ] "Visiting /booking-confirmed?session=cs_xxx shows clean booking details (date, teacher name, session)"

## Files

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
