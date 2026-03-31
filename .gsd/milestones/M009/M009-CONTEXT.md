---
depends_on: [M008]
---

# M009: Recurring Sessions

**Gathered:** 2026-03-31
**Status:** Ready for planning

## Project Description

Tutelo currently supports one-off bookings — parent picks a slot, pays, done. M009 adds recurring booking schedules so parents can set up weekly or biweekly sessions ("Every Tuesday at 4pm for 8 weeks") without rebooking manually each week. The system creates individual booking rows per session, handles per-session payment via saved cards, and lets both teacher and parent cancel single sessions or remaining series.

## Why This Milestone

Most tutoring relationships are ongoing. Rebooking manually every week is friction that kills retention. Recurring sessions are table stakes for any serious tutoring platform — without them, teachers lose students to competitors that offer this convenience. This is the single most-requested capability gap.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Parent selects a time slot and chooses "Repeat weekly for 6 weeks" in the booking flow
- System creates 6 individual booking rows, skipping any dates that conflict with existing bookings or unavailability
- Parent's card is saved and auto-charged 24 hours before each subsequent session
- Teacher sees recurring sessions in dashboard with a series badge and can cancel one or all remaining
- Parent receives email with a secure link to cancel individual sessions or the remaining series

### Entry point / environment

- Entry point: /[slug] booking calendar (parent-facing), /dashboard/sessions (teacher-facing), /manage/[token] (parent self-service)
- Environment: browser, production
- Live dependencies involved: Stripe (PaymentIntents, Customers, SetupIntents, saved payment methods), Supabase, Resend email, existing daily cron

## Completion Class

- Contract complete means: unit tests for conflict detection, series creation, cron charging logic, and cancellation all pass; tsc clean; build green
- Integration complete means: Stripe Customer + SetupIntent flow saves card; cron creates PaymentIntents with saved card; cancellation voids uncaptured PIs
- Operational complete means: cron charges recurring sessions on schedule within Vercel Hobby limits

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A parent can complete the full recurring booking flow end-to-end: pick slot → choose recurrence → see skipped dates → confirm → card saved → first session authorized
- The cron successfully charges a saved card for an upcoming recurring session
- Teacher can cancel a single session and the remaining series from dashboard
- Parent can cancel via secure email link

## Risks and Unknowns

- **Stripe SetupIntent + saved payment method flow** — new Stripe surface area for Tutelo. Must handle card expiry, insufficient funds, and 3D Secure re-authentication gracefully.
- **Cron payment failure handling** — if the daily cron fails to charge a session, the booking must not proceed as if paid. Need clear failure states and notifications.
- **Partial series conflict detection across N dates** — checking availability + existing bookings for N future dates in one request. Must be performant and handle edge cases (overrides that close a day, new bookings that appear between series creation and future dates).
- **Bookings unique constraint behavior** — the existing `bookings_unique_slot` constraint (teacher_id, booking_date, start_time) naturally prevents double-booking but will fail individual inserts within a batch. Need to handle this gracefully, not as a hard error.

## Existing Codebase / Prior Art

- `src/app/api/direct-booking/create-intent/route.ts` — current PaymentIntent creation flow. Session type pricing fork (flat price vs hourly_rate proration). Booking row created before PI. Orphan cleanup on PI failure.
- `src/actions/bookings.ts` — submitBookingRequest (deferred path via RPC), acceptBooking, cancelSession, markSessionComplete. cancelSession handles Stripe PI void + email + SMS + waitlist notification.
- `src/lib/utils/slots.ts` — generateSlotsFromWindow, getSlotsForDate. Override-wins-recurring precedence. durationMinutes parameter.
- `src/components/profile/BookingCalendar.tsx` — 750-line client component. State machine: calendar → form → auth → payment → success/error. Session type selector as calendar-step guard.
- `src/app/api/cron/stripe-reminders/route.ts` — daily cron at 9 AM UTC. Processes upcoming sessions for email/SMS reminders.
- `supabase/migrations/0001_initial_schema.sql` — bookings table with `bookings_unique_slot` UNIQUE (teacher_id, booking_date, start_time).
- `src/lib/supabase/service.ts` — supabaseAdmin (service role) for unauthenticated server-side mutations.
- `src/lib/utils/booking.ts` — computeSessionAmount pure function for hourly_rate proration.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- RECUR-01 — Parent can set recurring schedule (weekly/biweekly, N weeks) in booking flow
- RECUR-02 — System auto-creates individual booking rows for series
- RECUR-03 — Each recurring session has individual payment handling
- RECUR-04 — Teacher and parent can cancel individual sessions or series
- RECUR-05 — Recurring bookings respect availability and prevent double-booking
- RECUR-06 — Saved card via Stripe Customer + SetupIntent for auto-charge
- RECUR-07 — Cron charges upcoming recurring sessions 24h before
- RECUR-08 — Parent self-service cancellation via secure link/page
- RECUR-09 — Recurring sessions visible in dashboard with series badge

## Scope

### In Scope

- recurring_schedules table + recurring_schedule_id FK on bookings
- Recurring option in BookingCalendar (weekly/biweekly, N weeks picker)
- Multi-date availability + conflict checking
- Partial series creation with skipped-date summary
- Stripe Customer creation + SetupIntent for card saving
- First session: existing PaymentIntent authorize flow
- Subsequent sessions: cron charges saved card 24h before
- Payment failure handling (status update, notifications)
- Single-session cancellation within a series
- Series cancellation (all remaining future sessions)
- Teacher dashboard series badge + cancel series action
- Parent self-service cancel page via secure token link
- Email notifications for recurring booking confirmation, upcoming charges, and payment failures

### Out of Scope / Non-Goals

- Recurring schedule modification (change day/time of future sessions) — separate follow-up
- Automatic rescheduling when teacher changes availability
- Parent dashboard (M010 scope)
- Discount for recurring commitment (no special pricing)
- Recurring series with different session types per session

## Technical Constraints

- Vercel Hobby plan: 1 daily cron. Must extend existing stripe-reminders cron, not add a second.
- Stripe authorization window: 7 days. Sessions beyond day 7 cannot be pre-authorized — must use saved card.
- bookings_unique_slot UNIQUE constraint: prevents double-booking but means batch inserts will fail individually on conflict — need per-row error handling or pre-check.
- BookingCalendar is already 750 lines. Adding recurring UI must be done carefully — likely a separate step/component within the existing state machine, not inline expansion.

## Integration Points

- **Stripe** — Customers API (create/retrieve), SetupIntents API (card saving), PaymentIntents API (auto-charge from saved card), existing destination charge pattern with application_fee_amount
- **Supabase** — new recurring_schedules table, bookings.recurring_schedule_id FK, availability + availability_overrides queries for conflict detection
- **Resend** — new email templates: recurring booking confirmation (with skipped dates), upcoming charge notification, payment failure notification
- **Existing cron** — /api/cron/stripe-reminders extended with recurring charge logic

## Open Questions

- Should the parent see a "manage my series" page or just individual cancel links per session email? — Leaning toward a /manage/[token] page that shows the full series with cancel options for each or all.
- Should we create a Stripe Customer for all parents or only those who book recurring? — Leaning toward only recurring bookers to minimize Stripe object creation for one-off bookings.
