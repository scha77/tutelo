# T01: 02-booking-requests 01

**Slice:** S02 — **Milestone:** M001

## Description

Wire the existing BookingCalendar stub into a real booking flow: Postgres atomic insert function, Zod validation, Server Action, and updated BookingCalendar with subject dropdown and inline success/error states.

Purpose: Makes the core booking loop functional — a parent can request a session from any teacher's public page without any Stripe account required.
Output: Migration 0003, booking Zod schema, bookings Server Actions, updated BookingCalendar and /[slug] page.

## Must-Haves

- [ ] "Parent can select a time slot, fill out name/subject/email/notes, and submit — no account required"
- [ ] "Booking is inserted atomically; a duplicate slot returns an inline error, not a crash"
- [ ] "After success, an inline confirmation appears inside the BookingCalendar card with the booked date, time, and subject"
- [ ] "After a double-booking error, an inline error message appears with a back button — no page change"
- [ ] "Teacher without Stripe can still receive booking requests (STRIPE-01 — no Stripe gate)"

## Files

- `supabase/migrations/0003_create_booking_fn.sql`
- `src/lib/schemas/booking.ts`
- `src/actions/bookings.ts`
- `src/components/profile/BookingCalendar.tsx`
- `src/app/[slug]/page.tsx`
- `tests/bookings/booking-schema.test.ts`
- `tests/bookings/booking-action.test.ts`
- `tests/bookings/booking-calendar.test.tsx`
