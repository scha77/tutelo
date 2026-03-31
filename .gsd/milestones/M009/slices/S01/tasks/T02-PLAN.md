---
estimated_steps: 41
estimated_files: 3
skills_used: []
---

# T02: Build create-recurring API route with Stripe setup_future_usage and integration tests

Create the POST `/api/direct-booking/create-recurring` API route that: authenticates the parent, validates input via a new Zod schema, calls generateRecurringDates + checkDateConflicts, inserts a recurring_schedules row, batch-inserts booking rows, creates a Stripe Customer + PaymentIntent with `setup_future_usage: 'off_session'` and `capture_method: 'manual'`, and returns the client secret + session dates + skipped dates. Then write comprehensive integration tests following the exact `payment-intent.test.ts` mock pattern.

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

## Inputs

- ``src/lib/utils/recurring.ts` — generateRecurringDates and checkDateConflicts functions from T01`
- ``src/lib/schemas/booking.ts` — existing BookingRequestSchema pattern`
- ``src/app/api/direct-booking/create-intent/route.ts` — reference for Stripe PI creation, auth pattern, error handling`
- ``src/__tests__/payment-intent.test.ts` — exact mock pattern to follow (vi.hoisted, MockStripeClass, Supabase fromMock chain)`
- ``src/lib/utils/booking.ts` — computeSessionAmount for hourly rate fallback`

## Expected Output

- ``src/lib/schemas/booking.ts` — RecurringBookingSchema added`
- ``src/app/api/direct-booking/create-recurring/route.ts` — full API route`
- ``src/__tests__/create-recurring.test.ts` — integration tests for recurring route`

## Verification

npx vitest run create-recurring --reporter=verbose && npx tsc --noEmit
