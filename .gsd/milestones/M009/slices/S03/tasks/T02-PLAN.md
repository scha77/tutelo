---
estimated_steps: 55
estimated_files: 6
skills_used: []
---

# T02: Add teacher cancel actions, series badge in dashboard, and RecurringCancellationEmail

Delivers the teacher-facing cancellation experience: new server actions for single-session and series cancel, dashboard sessions page extended to show recurring sessions with a badge, ConfirmedSessionCard with Cancel Series button, and a new RecurringCancellationEmail template.

## Steps

1. Create `src/emails/RecurringCancellationEmail.tsx`:
   - Dual-variant React Email template (parent + teacher) following CancellationEmail pattern
   - Props: recipientFirstName, teacherName, studentName, subject, cancelledDates (string[]), startTime, isTeacher
   - Shows list of all cancelled session dates
   - Parent variant: "Your recurring series has been cancelled" + list of cancelled dates
   - Teacher variant: "The recurring series with {studentName} has been cancelled"
   - Use same styling as CancellationEmail (sans-serif, #f9fafb bg, 520px container, UTC noon date anchor)

2. Add `sendRecurringCancellationEmail` to `src/lib/email.ts`:
   - Params: `{ scheduleId: string }` — fetches all data internally via supabaseAdmin
   - Query recurring_schedules joined with bookings (status='cancelled', today or future) to get cancelled dates
   - Query teacher for full_name + social_email
   - Send parent email (always) + teacher email (if social_email set)
   - Follow existing sendCancellationEmail pattern exactly

3. Add `cancelSingleRecurringSession` server action to `src/actions/bookings.ts`:
   - Teacher-authenticated (same pattern as existing cancelSession)
   - Fetch booking by ID with `.eq('teacher_id', teacher.id)` and `.in('status', ['requested','confirmed','payment_failed'])`
   - If booking has `stripe_payment_intent`, call `stripe.paymentIntents.cancel()` — try/catch, non-blocking on error
   - Update booking status to 'cancelled'
   - Call `sendCancellationEmail(bookingId)` fire-and-forget (existing function works for single cancel)
   - `revalidatePath('/dashboard/sessions')` + `revalidatePath('/dashboard', 'layout')`

4. Add `cancelRecurringSeries` server action to `src/actions/bookings.ts`:
   - Teacher-authenticated
   - Params: `scheduleId: string`
   - Verify schedule belongs to teacher: query recurring_schedules.teacher_id via supabaseAdmin
   - Fetch all future non-cancelled bookings: `.eq('recurring_schedule_id', scheduleId).gte('booking_date', todayStr).in('status', ['requested','confirmed','payment_failed'])`
   - For each booking with stripe_payment_intent: void PI (try/catch, non-blocking)
   - Batch update all matched bookings to status 'cancelled'
   - Call `sendRecurringCancellationEmail({ scheduleId })` fire-and-forget
   - `revalidatePath('/dashboard/sessions')` + `revalidatePath('/dashboard', 'layout')`

5. Extend `src/app/(dashboard)/dashboard/sessions/page.tsx`:
   - Add `recurring_schedule_id, is_recurring_first, status` to the upcoming bookings select
   - Change upcoming status filter from `.eq('status', 'confirmed')` to `.in('status', ['confirmed', 'payment_failed'])`
   - Pass `recurringScheduleId`, `status`, and `cancelSeriesAction={cancelRecurringSeries}` to ConfirmedSessionCard
   - Import `cancelRecurringSeries` from `@/actions/bookings`

6. Extend `src/components/dashboard/ConfirmedSessionCard.tsx`:
   - Add optional props: `recurringScheduleId?: string | null`, `bookingStatus?: string`, `cancelSeriesAction?: (id: string) => Promise<{ success?: true; error?: string }>`
   - When `recurringScheduleId` is set, render an amber/blue "Recurring" badge pill
   - When `bookingStatus === 'payment_failed'`, render an amber "Payment Failed" badge instead of green "Confirmed"
   - When `recurringScheduleId && cancelSeriesAction`, render a "Cancel Series" button that calls `cancelSeriesAction(recurringScheduleId)` with confirm dialog
   - Keep existing Cancel Session button unchanged

7. Create `src/__tests__/cancel-recurring.test.ts`:
   - Follow cancel-session.test.ts mock pattern exactly (vi.mock for supabase, stripe, email, sms, waitlist)
   - Test cancelSingleRecurringSession: auth check, ownership check, handles confirmed/requested/payment_failed statuses, voids PI when present, skips void when no PI, updates DB, sends email, resilient to Stripe errors
   - Test cancelRecurringSeries: auth check, schedule ownership, fetches future bookings only, voids PIs for each, batch updates, sends series cancellation email, handles empty future list

## Must-Haves

- [ ] cancelSingleRecurringSession handles confirmed, requested, and payment_failed statuses
- [ ] cancelRecurringSeries only cancels future bookings (booking_date >= today)
- [ ] cancelRecurringSeries voids Stripe PIs where present, non-blocking on errors
- [ ] RecurringCancellationEmail shows all cancelled dates with parent + teacher variants
- [ ] ConfirmedSessionCard shows 'Recurring' badge when recurringScheduleId is set
- [ ] ConfirmedSessionCard shows 'Payment Failed' badge when status is payment_failed
- [ ] Sessions page query includes payment_failed status bookings
- [ ] All cancel-recurring tests pass

## Inputs

- ``src/actions/bookings.ts` — existing cancel actions to extend with recurring variants`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — existing sessions page to extend query`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — existing card component to add badge + series cancel`
- ``src/emails/CancellationEmail.tsx` — template pattern for RecurringCancellationEmail`
- ``src/lib/email.ts` — email helper module to add sendRecurringCancellationEmail`
- ``src/__tests__/cancel-session.test.ts` — mock pattern reference for new tests`
- ``supabase/migrations/0016_cancel_token.sql` — T01 output, confirms cancel_token column exists`

## Expected Output

- ``src/emails/RecurringCancellationEmail.tsx` — new dual-variant email template for series cancellation`
- ``src/lib/email.ts` — modified with sendRecurringCancellationEmail helper`
- ``src/actions/bookings.ts` — modified with cancelSingleRecurringSession + cancelRecurringSeries`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — modified with recurring fields + payment_failed status`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — modified with series badge + Cancel Series button`
- ``src/__tests__/cancel-recurring.test.ts` — new test file for recurring cancel actions`

## Verification

npx vitest run cancel-recurring --reporter=verbose && npx tsc --noEmit && npm run build
