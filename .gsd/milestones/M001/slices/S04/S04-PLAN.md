# S04: Direct Booking Parent Account

**Goal:** Lay the foundation for Phase 4: run the DB migration that adds `reminder_sent_at` to bookings, then scaffold all 7 Wave-0 test files as green `it.
**Demo:** Lay the foundation for Phase 4: run the DB migration that adds `reminder_sent_at` to bookings, then scaffold all 7 Wave-0 test files as green `it.

## Must-Haves


## Tasks

- [x] **T01: 04-direct-booking-parent-account 01** `est:3min`
  - Lay the foundation for Phase 4: run the DB migration that adds `reminder_sent_at` to bookings, then scaffold all 7 Wave-0 test files as green `it.todo()` stubs.

Purpose: Later plans (02, 03, 04) can all run in parallel in Wave 2 without worrying about the schema column or missing test files.
Output: 0005 migration SQL + 7 test stub files. Full vitest suite green.
- [x] **T02: 04-direct-booking-parent-account 02** `est:45min`
  - Build the complete direct booking flow: the `create-intent` API route that creates a PaymentIntent and booking row, the `InlineAuthForm` and `PaymentStep` components, the BookingCalendar extension with `'auth'` and `'payment'` steps, the webhook handler extension for `payment_intent.amount_capturable_updated`, the `[slug]/page.tsx` prop update, and the `BookingConfirmationEmail` update with an `/account` link for parents. Implements BOOK-05, PARENT-01, and the PARENT-02 email discoverability path.

Purpose: When a teacher has Stripe connected, parents go from slot selection through auth to Stripe Elements payment in one inline flow — no redirect, no separate checkout page. After payment, the confirmation email gives parents the `/account` link so they can find their session history.
Output: End-to-end direct booking path live. Deferred path (Phase 3) untouched for teachers without Stripe. Confirmation email includes /account link for parents.
- [x] **T03: 04-direct-booking-parent-account 03** `est:15min`
  - Build the parent-facing `/account` route (PARENT-02), the rebook shortcut URL param pre-fill in BookingCalendar (PARENT-03), middleware protection for `/account`, and login redirect support for `?redirect=` param.

Purpose: Parents who complete a direct booking need a place to see their session history and rebook. The `/account` route is completely separate from `/dashboard` (teacher-only). The rebook shortcut pre-fills subject so parents just pick a new time slot.
Output: /account page live with upcoming + past sections and rebook buttons. Role-based redirect logic keeps teachers in /dashboard. BookingCalendar reads ?subject= on mount for rebook pre-fill.
- [x] **T04: 04-direct-booking-parent-account 04** `est:15min`
  - Implement the 24-hour session reminder system (NOTIF-04): `SessionReminderEmail` react-email template, `sendSessionReminderEmail` function in email.ts, the nightly cron endpoint at `/api/cron/session-reminders`, and the `vercel.json` cron schedule entry.

Purpose: Both teacher and parent receive a reminder the day before their session — reduces no-shows. The `reminder_sent_at` column (added in Plan 01 migration) provides idempotency so a daily cron run cannot double-send.
Output: Nightly cron live in production sending reminder emails to both parties.

## Files Likely Touched

- `supabase/migrations/0005_phase4_direct_booking.sql`
- `src/__tests__/booking-routing.test.ts`
- `src/__tests__/payment-intent.test.ts`
- `src/__tests__/webhook-capture.test.ts`
- `src/__tests__/parent-auth.test.ts`
- `src/__tests__/parent-account.test.ts`
- `src/__tests__/rebook.test.ts`
- `src/__tests__/reminders.test.ts`
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
- `src/app/account/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `middleware.ts`
- `src/components/profile/BookingCalendar.tsx`
- `src/__tests__/parent-account.test.ts`
- `src/__tests__/rebook.test.ts`
- `src/emails/SessionReminderEmail.tsx`
- `src/lib/email.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `vercel.json`
- `src/__tests__/reminders.test.ts`
