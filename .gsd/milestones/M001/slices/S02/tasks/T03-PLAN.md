# T03: 02-booking-requests 03

**Slice:** S02 — **Milestone:** M001

## Description

Install Resend + react-email, create two email templates (money-waiting and standard booking notification), and implement sendBookingEmail() which wires into the submitBookingRequest Server Action that was created in Plan 02-01.

Purpose: Completes the notification loop — teachers receive an urgent "money waiting" email the moment a booking arrives, driving Stripe Connect activation.
Output: src/lib/email.ts, two react-email templates, email unit tests.

## Must-Haves

- [ ] "After a booking is submitted, the teacher receives an email"
- [ ] "If teacher has not connected Stripe: email subject is 'A parent wants to book you — connect Stripe to confirm', with Activate Payments CTA"
- [ ] "If teacher has connected Stripe: email subject is 'New booking request from [student]'s parent', with dashboard link"
- [ ] "If teacher has no social_email set: email is silently skipped (booking still succeeds)"
- [ ] "Email is fire-and-forget — it never blocks booking confirmation to the parent"

## Files

- `src/lib/email.ts`
- `src/emails/MoneyWaitingEmail.tsx`
- `src/emails/BookingNotificationEmail.tsx`
- `tests/bookings/email.test.ts`
