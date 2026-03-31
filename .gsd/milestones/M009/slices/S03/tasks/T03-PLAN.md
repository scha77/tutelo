---
estimated_steps: 49
estimated_files: 5
skills_used: []
---

# T03: Build parent self-service /manage/[token] page with token-gated cancel API routes

Delivers the parent-facing self-service cancellation page. The parent clicks a manage link in their confirmation email, sees their upcoming sessions, and can cancel individual sessions or the entire remaining series — no login required.

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

## Inputs

- ``src/app/review/[token]/page.tsx` — RSC pattern reference for token-based pages`
- ``src/lib/supabase/service.ts` — supabaseAdmin for token lookup`
- ``src/lib/email.ts` — sendCancellationEmail + sendRecurringCancellationEmail (T02 output)`
- ``src/emails/RecurringCancellationEmail.tsx` — T02 output, used by cancel-series route`
- ``supabase/migrations/0016_cancel_token.sql` — T01 output, confirms cancel_token column exists`
- ``src/__tests__/recurring-charges.test.ts` — mock pattern reference for route tests`

## Expected Output

- ``src/app/api/manage/cancel-session/route.ts` — new token-gated single-session cancel route`
- ``src/app/api/manage/cancel-series/route.ts` — new token-gated series cancel route`
- ``src/app/manage/[token]/page.tsx` — new RSC for parent self-service manage page`
- ``src/app/manage/[token]/CancelSeriesForm.tsx` — new client component for cancel form`
- ``src/__tests__/manage-cancel.test.ts` — new test file for token-gated cancel routes`

## Verification

npx vitest run manage-cancel --reporter=verbose && npx tsc --noEmit && npm run build
