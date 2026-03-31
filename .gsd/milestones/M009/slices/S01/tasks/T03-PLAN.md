---
estimated_steps: 24
estimated_files: 3
skills_used: []
---

# T03: Build RecurringOptions component and wire into BookingCalendar state machine

Create the `RecurringOptions` component that lets a parent choose a recurring schedule (frequency + session count), shows projected dates with conflict annotations, and wire it into BookingCalendar as a new 'recurring' step between 'form' and 'auth'/'payment'. The existing one-time booking path must remain unchanged when the parent selects 'One-time' (the default).

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

## Inputs

- ``src/lib/utils/recurring.ts` — generateRecurringDates for client-side date preview, checkDateConflicts for server-side conflict check`
- ``src/components/profile/BookingCalendar.tsx` — existing state machine (step types, handleSubmit, createPaymentIntent, PaymentStep usage)`
- ``src/components/profile/PaymentStep.tsx` — reused for recurring first-session payment confirmation`
- ``src/app/api/direct-booking/create-recurring/route.ts` — API route to call from createRecurringIntent`

## Expected Output

- ``src/components/profile/RecurringOptions.tsx` — recurring options picker with projected dates`
- ``src/app/api/direct-booking/check-conflicts/route.ts` — conflict pre-check endpoint`
- ``src/components/profile/BookingCalendar.tsx` — updated with 'recurring' step and createRecurringIntent`

## Verification

npx tsc --noEmit && npm run build
