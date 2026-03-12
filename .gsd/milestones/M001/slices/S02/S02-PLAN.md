# S02: Booking Requests

**Goal:** Wire the existing BookingCalendar stub into a real booking flow: Postgres atomic insert function, Zod validation, Server Action, and updated BookingCalendar with subject dropdown and inline success/error states.
**Demo:** Wire the existing BookingCalendar stub into a real booking flow: Postgres atomic insert function, Zod validation, Server Action, and updated BookingCalendar with subject dropdown and inline success/error states.

## Must-Haves


## Tasks

- [x] **T01: 02-booking-requests 01**
  - Wire the existing BookingCalendar stub into a real booking flow: Postgres atomic insert function, Zod validation, Server Action, and updated BookingCalendar with subject dropdown and inline success/error states.

Purpose: Makes the core booking loop functional — a parent can request a session from any teacher's public page without any Stripe account required.
Output: Migration 0003, booking Zod schema, bookings Server Actions, updated BookingCalendar and /[slug] page.
- [x] **T02: 02-booking-requests 02** `est:3min`
  - Build the teacher-facing booking requests dashboard: the /dashboard/requests page, RequestCard client component with accept/decline, Sidebar update with Requests nav item + badge, and the layout-level Stripe warning banner.

Purpose: Closes the teacher side of the booking loop — teachers see incoming requests and can act on them.
Output: /dashboard/requests page, RequestCard component, updated Sidebar, updated layout with pending count + Stripe banner.
- [x] **T03: 02-booking-requests 03** `est:4min`
  - Install Resend + react-email, create two email templates (money-waiting and standard booking notification), and implement sendBookingEmail() which wires into the submitBookingRequest Server Action that was created in Plan 02-01.

Purpose: Completes the notification loop — teachers receive an urgent "money waiting" email the moment a booking arrives, driving Stripe Connect activation.
Output: src/lib/email.ts, two react-email templates, email unit tests.

## Files Likely Touched

- `supabase/migrations/0003_create_booking_fn.sql`
- `src/lib/schemas/booking.ts`
- `src/actions/bookings.ts`
- `src/components/profile/BookingCalendar.tsx`
- `src/app/[slug]/page.tsx`
- `tests/bookings/booking-schema.test.ts`
- `tests/bookings/booking-action.test.ts`
- `tests/bookings/booking-calendar.test.tsx`
- `src/app/(dashboard)/dashboard/requests/page.tsx`
- `src/components/dashboard/RequestCard.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `tests/bookings/booking-action.test.ts`
- `src/lib/email.ts`
- `src/emails/MoneyWaitingEmail.tsx`
- `src/emails/BookingNotificationEmail.tsx`
- `tests/bookings/email.test.ts`
