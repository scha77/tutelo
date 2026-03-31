# S01: Schema & Recurring Booking Creation

**Goal:** Parent can select a recurring schedule (weekly/biweekly for N weeks) during the booking flow. System creates individual booking rows per session linked by recurring_schedule_id, skips conflicting dates, shows a summary, and saves the parent's card for future auto-charging via Stripe PaymentIntent with setup_future_usage.
**Demo:** After this: Parent selects 'Every Tuesday at 4pm for 6 weeks' in booking flow. System creates 6 individual booking rows linked by recurring_schedule_id, skipping conflicting dates with a summary shown to the parent.

## Tasks
- [x] **T01: Created recurring_schedules table migration, generateRecurringDates and checkDateConflicts utility functions, and 16 unit tests covering date generation, booking conflicts, availability gaps, and override precedence** — Create the SQL migration for the `recurring_schedules` table and new columns on `bookings`. Then implement the two pure utility functions (`generateRecurringDates`, `checkDateConflicts`) in `src/lib/utils/recurring.ts` with comprehensive unit tests. These functions are the testable core of the slice — they have zero external dependencies (conflict check queries are mocked in tests).

## Steps

1. Create `supabase/migrations/0014_recurring_schedules.sql`:
   - CREATE TABLE `recurring_schedules` with columns: id (UUID PK), teacher_id (FK teachers), parent_id (FK auth.users, nullable), parent_email (TEXT NOT NULL), frequency (TEXT CHECK IN weekly/biweekly), total_sessions (SMALLINT CHECK 2–26), start_date (DATE), start_time (TIME), end_time (TIME), stripe_customer_id (TEXT), stripe_payment_method_id (TEXT), created_at (TIMESTAMPTZ DEFAULT NOW())
   - ALTER TABLE bookings ADD COLUMN recurring_schedule_id UUID REFERENCES recurring_schedules(id)
   - ALTER TABLE bookings ADD COLUMN is_recurring_first BOOLEAN DEFAULT FALSE
   - CREATE INDEX on bookings(recurring_schedule_id) for S02/S03 queries

2. Create `src/lib/utils/recurring.ts` with:
   - `generateRecurringDates(startDate: string, frequency: 'weekly' | 'biweekly', count: number): string[]` — returns YYYY-MM-DD date strings for N sessions starting from startDate, advancing 7 or 14 days
   - `checkDateConflicts(teacherId: string, dates: string[], startTime: string, endTime: string, supabase: SupabaseClient): Promise<{ available: string[], skipped: { date: string, reason: string }[] }>` — queries bookings for conflicts (non-cancelled status + matching slot) and availability/overrides via per-date getSlotsForDate logic. A date is skipped if (a) an existing booking occupies the slot, or (b) the teacher has no availability window covering startTime–endTime on that date.

3. Create `src/__tests__/recurring-dates.test.ts` testing generateRecurringDates:
   - Weekly: 6 sessions starting 2026-04-07 → correct Tuesdays
   - Biweekly: 4 sessions starting 2026-04-07 → every other Tuesday
   - Edge: count=2 (minimum), count=26 (maximum)
   - Edge: month/year boundary crossing

4. Create `src/__tests__/recurring-conflicts.test.ts` testing checkDateConflicts:
   - Mock Supabase: existing booking on one date → that date skipped with reason 'already booked'
   - Mock Supabase: teacher has no availability on one date → that date skipped with reason 'not available'
   - Mock Supabase: override blocks one date → that date skipped
   - All dates clear → all returned as available
   - All dates conflicted → empty available, all skipped
  - Estimate: 1h30m
  - Files: supabase/migrations/0014_recurring_schedules.sql, src/lib/utils/recurring.ts, src/__tests__/recurring-dates.test.ts, src/__tests__/recurring-conflicts.test.ts
  - Verify: npx vitest run recurring-dates recurring-conflicts --reporter=verbose && npx tsc --noEmit
- [x] **T02: Built POST /api/direct-booking/create-recurring API route with Zod validation, recurring date generation, conflict checking, batch booking inserts, Stripe Customer + PaymentIntent with setup_future_usage, and 9 integration tests** — Create the POST `/api/direct-booking/create-recurring` API route that: authenticates the parent, validates input via a new Zod schema, calls generateRecurringDates + checkDateConflicts, inserts a recurring_schedules row, batch-inserts booking rows, creates a Stripe Customer + PaymentIntent with `setup_future_usage: 'off_session'` and `capture_method: 'manual'`, and returns the client secret + session dates + skipped dates. Then write comprehensive integration tests following the exact `payment-intent.test.ts` mock pattern.

## Steps

1. Add `RecurringBookingSchema` to `src/lib/schemas/booking.ts`:
   - teacherId: z.string().uuid()
   - bookingDate: z.string().regex(YYYY-MM-DD) — the series start date
   - startTime, endTime: z.string().regex(HH:MM)
   - studentName: z.string().min(1).max(100)
   - subject: z.string().min(1)
   - notes: z.string().max(1000).optional()
   - parentPhone: z.string().optional()
   - parentSmsOptIn: z.boolean().optional().default(false)
   - sessionTypeId: z.string().uuid().optional()
   - frequency: z.enum(['weekly', 'biweekly'])
   - totalSessions: z.number().int().min(2).max(26)

2. Create `src/app/api/direct-booking/create-recurring/route.ts`:
   - Auth: get user from Supabase session (401 if not logged in)
   - Validate body with RecurringBookingSchema
   - Fetch teacher: verify stripe_charges_enabled + stripe_account_id (400 if not connected)
   - Determine amount per session (session type price OR hourly rate proration, same as create-intent)
   - Call generateRecurringDates(bookingDate, frequency, totalSessions)
   - Call checkDateConflicts(teacherId, dates, startTime, endTime, supabaseAdmin)
   - Guard: if 0 available dates, return 409 'No available dates'
   - Insert recurring_schedules row (teacher_id, parent_id, parent_email, frequency, total_sessions, start_date, start_time, end_time)
   - Batch insert bookings: for each available date, insert with recurring_schedule_id, status='requested'; first date gets is_recurring_first=true
   - Handle 23505 per-row: skip and add to skippedDates
   - Create Stripe Customer: `stripe.customers.create({ email: user.email, metadata: { tutelo_user_id: user.id } })`
   - Create PaymentIntent for first session: amount, currency:'usd', capture_method:'manual', setup_future_usage:'off_session', customer: customerId, transfer_data:{destination: stripe_account_id}, application_fee_amount: 7%, metadata:{booking_id: firstBookingId, teacher_id, recurring_schedule_id}
   - Update recurring_schedules with stripe_customer_id and stripe_payment_method_id (payment_method comes after client confirms — for now store customer_id)
   - Return JSON: { clientSecret, recurringScheduleId, sessionDates[], skippedDates[], totalCreated }
   - On Stripe failure: delete all inserted bookings + schedule row, return 502

3. Create `src/__tests__/create-recurring.test.ts` following payment-intent.test.ts patterns:
   - Uses vi.hoisted for Stripe mock class with customers.create and paymentIntents.create
   - Uses vi.mock for supabase/server and supabase/service
   - Mock the recurring utility functions (generateRecurringDates, checkDateConflicts)
   - Test cases:
     a. Happy path: 6 weekly sessions, 1 skipped → returns clientSecret + 5 sessionDates + 1 skippedDate
     b. Unauthenticated → 401
     c. Teacher not Stripe-connected → 400
     d. Zero available dates → 409
     e. Invalid body (missing frequency) → 400
     f. Stripe failure → 502 + cleanup
  - Estimate: 2h
  - Files: src/lib/schemas/booking.ts, src/app/api/direct-booking/create-recurring/route.ts, src/__tests__/create-recurring.test.ts
  - Verify: npx vitest run create-recurring --reporter=verbose && npx tsc --noEmit
- [x] **T03: Built RecurringOptions component with frequency toggle, session count slider, projected dates with conflict annotations, and wired it into BookingCalendar as a new 'recurring' step between form and auth/payment — one-time path unchanged** — Create the `RecurringOptions` component that lets a parent choose a recurring schedule (frequency + session count), shows projected dates with conflict annotations, and wire it into BookingCalendar as a new 'recurring' step between 'form' and 'auth'/'payment'. The existing one-time booking path must remain unchanged when the parent selects 'One-time' (the default).

## Steps

1. Create `src/components/profile/RecurringOptions.tsx`:
   - Props: teacherId, selectedDate (Date), selectedSlot (TimeSlot), subjects (string[]), accentColor, onConfirm(frequency, count, availableDates, skippedDates), onBack()
   - State: frequency ('one-time' | 'weekly' | 'biweekly'), count (default 4, range 2–26), projectedDates[], skippedDates[], loading
   - When frequency is not 'one-time': call generateRecurringDates client-side for preview, then fetch `/api/direct-booking/check-conflicts` or compute locally
   - Since checkDateConflicts requires DB queries, add a lightweight POST `/api/direct-booking/check-conflicts/route.ts` that accepts {teacherId, dates[], startTime, endTime} and returns {available[], skipped[]}. Auth required.
   - Show: frequency toggle (One-time / Weekly / Biweekly), session count slider/input (2–26), end date display, list of projected dates with ✓/✗ markers for available/skipped, total sessions summary
   - 'One-time' selection: calls onConfirm with frequency='one-time' immediately (existing flow)
   - 'Confirm recurring' button: calls onConfirm with data

2. Create `src/app/api/direct-booking/check-conflicts/route.ts`:
   - POST handler: auth required, validates input, calls checkDateConflicts from recurring.ts, returns JSON {available, skipped}
   - This is a read-only pre-check endpoint — no state mutations

3. Modify `src/components/profile/BookingCalendar.tsx`:
   - Add 'recurring' to step type union: `'calendar' | 'form' | 'recurring' | 'success' | 'error' | 'auth' | 'payment'`
   - Add state: recurringData: { frequency, count, availableDates, skippedDates } | null
   - In handleSubmit (stripeConnected branch): instead of going to auth/payment, go to 'recurring' step first
   - In 'recurring' step: render <RecurringOptions> with onConfirm callback
   - onConfirm handler: if frequency='one-time', proceed to auth check → createPaymentIntent (existing flow). If recurring, store recurringData in state, then proceed to auth check → createRecurringIntent
   - Add createRecurringIntent function: fetches /api/direct-booking/create-recurring with form data + recurringData, stores clientSecret, goes to 'payment' step
   - PaymentStep reuse: the PI returned from create-recurring has setup_future_usage but confirmPayment() works the same
   - Update success state to show recurring summary when recurringData is set (session dates list, skipped dates)
   - Import RecurringOptions, generateRecurringDates from their modules
   - Keep the 'not stripeConnected' (deferred) path completely unchanged — recurring is only for direct booking
  - Estimate: 2h
  - Files: src/components/profile/RecurringOptions.tsx, src/app/api/direct-booking/check-conflicts/route.ts, src/components/profile/BookingCalendar.tsx
  - Verify: npx tsc --noEmit && npm run build
- [ ] **T04: Create RecurringBookingConfirmationEmail and wire into create-recurring route** — Build the React Email template for recurring booking confirmations that shows the full series schedule (all session dates, skipped dates with reasons, frequency, total sessions). Then wire it into the create-recurring API route so confirmation emails are sent on successful booking creation.

## Steps

1. Create `src/emails/RecurringBookingConfirmationEmail.tsx`:
   - Follow existing BookingConfirmationEmail.tsx pattern (React Email components: Html, Head, Preview, Body, Container, Section, Text, Hr, Link)
   - Props: recipientFirstName, teacherName, studentName, subject, frequency ('weekly'|'biweekly'), sessionDates (string[] — YYYY-MM-DD), skippedDates ({date: string, reason: string}[]), startTime (HH:MM), isTeacher (boolean), accountUrl (optional)
   - Preview text: 'Your recurring tutoring schedule is confirmed — N sessions starting [date]'
   - Body: greeting, summary line ('You've booked N [weekly/biweekly] tutoring sessions...'), numbered list of session dates formatted as 'Tuesday, April 7, 2026 at 4:00 PM', if skippedDates.length > 0: section titled 'Dates skipped' with each date and reason, note about automatic payment for future sessions, link to account/sessions if accountUrl provided
   - Export as named export

2. Wire email sending into `src/app/api/direct-booking/create-recurring/route.ts`:
   - Import Resend and the new email template
   - After successful PI creation, send confirmation email to parent with session details
   - Send notification email to teacher (reuse existing BookingNotificationEmail or create a brief notification — use the simpler approach of including recurring info in the existing notification pattern)
   - Email sending is fire-and-forget (don't fail the booking if email fails) — wrap in try/catch with console.error

3. Verify TypeScript compilation and build pass with the new email template.
  - Estimate: 45m
  - Files: src/emails/RecurringBookingConfirmationEmail.tsx, src/app/api/direct-booking/create-recurring/route.ts
  - Verify: npx tsc --noEmit && npm run build
