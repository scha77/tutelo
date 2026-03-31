# S03: Cancellation & Dashboard Series UX

**Goal:** Teacher sees recurring series badge on dashboard sessions and can cancel one or all remaining. Parent receives email with secure manage link to cancel individual sessions or the series via /manage/[token].
**Demo:** After this: Teacher sees series badge on recurring sessions in dashboard and can cancel one or all remaining. Parent receives email with secure link to cancel individual sessions or the series.

## Tasks
- [x] **T01: Added cancel_token column to recurring_schedules, generated token at booking creation, and included manage URL in parent confirmation email** — Foundation task: creates the cancel_token column on recurring_schedules, generates the token at booking creation time, and adds the manage URL to the parent confirmation email. This unblocks both T02 (needs the column for series cancel queries) and T03 (needs the token for the /manage page).

## Steps

1. Create `supabase/migrations/0016_cancel_token.sql`:
   - `ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE`
   - `ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS cancel_token_created_at TIMESTAMPTZ`
   - `CREATE INDEX IF NOT EXISTS idx_recurring_schedules_cancel_token ON recurring_schedules (cancel_token) WHERE cancel_token IS NOT NULL`

2. Modify `src/app/api/direct-booking/create-recurring/route.ts`:
   - Import `randomBytes` from `crypto` (already imported in bookings.ts — follow same pattern)
   - After computing the schedule data but before the insert, generate `const cancelToken = randomBytes(32).toString('hex')`
   - Add `cancel_token: cancelToken, cancel_token_created_at: new Date().toISOString()` to the recurring_schedules insert
   - After successful booking creation, compute `const manageUrl = \`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/manage/${cancelToken}\``
   - Pass `manageUrl` to the `sendRecurringBookingConfirmationEmail` call

3. Modify `src/emails/RecurringBookingConfirmationEmail.tsx`:
   - Add optional `manageUrl?: string` prop to the interface
   - After the payment note for parent (!isTeacher), add a section with a 'Manage your series' link pointing to manageUrl
   - Only render this section when manageUrl is provided and !isTeacher

4. Modify `src/lib/email.ts` in `sendRecurringBookingConfirmationEmail`:
   - Add optional `manageUrl?: string` to the params type
   - Pass `manageUrl` through to the parent variant of RecurringBookingConfirmationEmail

## Must-Haves

- [ ] Migration 0016 creates cancel_token + index on recurring_schedules
- [ ] create-recurring route generates and stores cancel_token
- [ ] Parent confirmation email includes manage URL link
- [ ] manageUrl only rendered in parent variant, not teacher variant
  - Estimate: 30m
  - Files: supabase/migrations/0016_cancel_token.sql, src/app/api/direct-booking/create-recurring/route.ts, src/emails/RecurringBookingConfirmationEmail.tsx, src/lib/email.ts
  - Verify: npx tsc --noEmit && npm run build
- [ ] **T02: Add teacher cancel actions, series badge in dashboard, and RecurringCancellationEmail** — Delivers the teacher-facing cancellation experience: new server actions for single-session and series cancel, dashboard sessions page extended to show recurring sessions with a badge, ConfirmedSessionCard with Cancel Series button, and a new RecurringCancellationEmail template.

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
  - Estimate: 2h
  - Files: src/emails/RecurringCancellationEmail.tsx, src/lib/email.ts, src/actions/bookings.ts, src/app/(dashboard)/dashboard/sessions/page.tsx, src/components/dashboard/ConfirmedSessionCard.tsx, src/__tests__/cancel-recurring.test.ts
  - Verify: npx vitest run cancel-recurring --reporter=verbose && npx tsc --noEmit && npm run build
- [ ] **T03: Build parent self-service /manage/[token] page with token-gated cancel API routes** — Delivers the parent-facing self-service cancellation page. The parent clicks a manage link in their confirmation email, sees their upcoming sessions, and can cancel individual sessions or the entire remaining series — no login required.

## Steps

1. Create `src/app/api/manage/cancel-session/route.ts`:
   - POST route, no auth required — token is the authentication
   - Body: `{ bookingId: string, token: string }`
   - Look up recurring_schedules by cancel_token via supabaseAdmin
   - Verify the bookingId belongs to this schedule (`.eq('recurring_schedule_id', schedule.id).eq('id', bookingId)`)
   - Verify booking is in cancellable status: `['requested','confirmed','payment_failed']`
   - If booking has stripe_payment_intent, call `stripe.paymentIntents.cancel()` (try/catch, non-blocking)
   - Update booking status to 'cancelled'
   - Call `sendCancellationEmail(bookingId)` fire-and-forget
   - Return `{ success: true }` or `{ error: '...' }` with appropriate status codes (400 for bad input, 404 for not found, 200 for success)

2. Create `src/app/api/manage/cancel-series/route.ts`:
   - POST route, no auth required — token is the authentication
   - Body: `{ token: string }`
   - Look up recurring_schedules by cancel_token via supabaseAdmin
   - Fetch all future non-cancelled bookings for this schedule: `.eq('recurring_schedule_id', schedule.id).gte('booking_date', todayStr).in('status', ['requested','confirmed','payment_failed'])`
   - For each booking with stripe_payment_intent: void PI (try/catch, non-blocking)
   - Batch update all to status 'cancelled'
   - Call `sendRecurringCancellationEmail({ scheduleId: schedule.id })` fire-and-forget
   - Return `{ success: true, cancelledCount: N }` or `{ error: '...' }`

3. Create `src/app/manage/[token]/page.tsx` (RSC):
   - Follow review/[token]/page.tsx pattern exactly
   - Look up recurring_schedules by cancel_token via supabaseAdmin
   - If not found → "Invalid or expired link" error state
   - Fetch all non-cancelled future bookings for this schedule
   - If empty → "All sessions in this series have already been cancelled" state
   - Also fetch teacher name via teachers join for display
   - Render CancelSeriesForm with sessions list + token + scheduleId

4. Create `src/app/manage/[token]/CancelSeriesForm.tsx` (client component):
   - Props: `{ sessions: Array<{id, studentName, subject, bookingDate, startTime, status}>, token: string, teacherName: string }`
   - Show list of upcoming sessions with date, student name, status badge (Confirmed / Payment Failed)
   - Each row has a "Cancel This Session" button → calls POST /api/manage/cancel-session with { bookingId, token }
   - "Cancel All Remaining" button at bottom → calls POST /api/manage/cancel-series with { token }
   - Both buttons show confirm dialog before proceeding
   - On success: remove cancelled session from list, show success toast
   - When all sessions cancelled: show "All sessions cancelled" completion state
   - Use fetch() for API calls (not server actions — this page has no auth context)

5. Create `src/__tests__/manage-cancel.test.ts`:
   - Follow recurring-charges.test.ts mock pattern (vi.hoisted for Stripe, vi.mock for supabase/email)
   - Test cancel-session route: invalid token (404), booking not in schedule (404), booking not cancellable (400), success with PI void, success without PI
   - Test cancel-series route: invalid token (404), no future bookings (200 with cancelledCount 0), success cancels all future bookings, voids PIs, sends email

## Must-Haves

- [ ] /manage/[token] RSC resolves token and shows appropriate state (valid, invalid, all-cancelled)
- [ ] CancelSeriesForm shows individual cancel per session + cancel-all-remaining
- [ ] POST /api/manage/cancel-session validates token owns the booking before cancelling
- [ ] POST /api/manage/cancel-series cancels only future non-cancelled bookings
- [ ] Token-gated routes have no auth requirement (token IS the auth)
- [ ] All manage-cancel tests pass
  - Estimate: 2h
  - Files: src/app/api/manage/cancel-session/route.ts, src/app/api/manage/cancel-series/route.ts, src/app/manage/[token]/page.tsx, src/app/manage/[token]/CancelSeriesForm.tsx, src/__tests__/manage-cancel.test.ts
  - Verify: npx vitest run manage-cancel --reporter=verbose && npx tsc --noEmit && npm run build
