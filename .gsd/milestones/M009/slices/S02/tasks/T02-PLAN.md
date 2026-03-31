---
estimated_steps: 77
estimated_files: 5
skills_used: []
---

# T02: Recurring charges cron route, email template, and integration tests

Build the daily cron that auto-charges parents' saved cards 24h before each recurring session, plus the payment-failed email template and send function. This is the core deliverable of S02.

## Steps

1. Create `src/emails/RecurringPaymentFailedEmail.tsx` following the `CancellationEmail.tsx` pattern (React Email components):
   - Props: `recipientFirstName`, `studentName`, `bookingDate` (YYYY-MM-DD), `startTime` (HH:MM), `teacherName`, `isTeacher`, `accountUrl?` (optional, parent-only)
   - Parent variant: 'Your payment of $X for [student]'s session on [date] failed. Please update your payment method.' with link to accountUrl
   - Teacher variant: 'The automatic payment for [student]'s session on [date] failed. We'll notify you if it's resolved.'
   - Use same styling as CancellationEmail: sans-serif, #f9fafb background, 520px container, 8px border-radius
   - Format date with `new Date(bookingDate + 'T12:00:00').toLocaleDateString('en-US', {...})` (UTC noon anchor, same as CancellationEmail)

2. Add `sendRecurringPaymentFailedEmail` to `src/lib/email.ts`:
   - Params: `{ bookingId: string }` — function fetches booking + teacher data internally (same pattern as `sendCancellationEmail`)
   - Query: `supabaseAdmin.from('bookings').select('parent_email, student_name, booking_date, start_time, teachers(full_name, social_email)').eq('id', bookingId).single()`
   - Send parent email always; send teacher email only if `teacher.social_email` is set
   - Import `RecurringPaymentFailedEmail` at top of file
   - Pass `accountUrl` to parent variant only

3. Create `src/app/api/cron/recurring-charges/route.ts`:
   - Auth: `request.headers.get('authorization') !== \`Bearer ${process.env.CRON_SECRET}\`` → 401
   - Compute `tomorrowUtc = new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 10)`
   - Query bookings: `.eq('booking_date', tomorrowUtc).eq('status', 'requested').eq('is_recurring_first', false).not('recurring_schedule_id', 'is', null)` with select joining `recurring_schedules!inner(stripe_customer_id, stripe_payment_method_id, teachers!inner(stripe_account_id, hourly_rate, full_name, social_email))` and `session_types(price)`
   - For each session:
     - Skip if `recurring_schedules.stripe_payment_method_id` is null (log + increment skipped counter)
     - Compute `amountInCents`: if `session_types?.price` use `Math.round(Number(price) * 100)`, else use `computeSessionAmount(start_time, end_time, hourly_rate)`
     - `applicationFeeAmount = Math.round(amountInCents * 0.07)`
     - `stripe.paymentIntents.create({ amount: amountInCents, currency: 'usd', customer: stripe_customer_id, payment_method: stripe_payment_method_id, off_session: true, confirm: true, capture_method: 'manual', transfer_data: { destination: stripe_account_id }, application_fee_amount: applicationFeeAmount, metadata: { booking_id, teacher_id, recurring_schedule_id } }, { idempotencyKey: \`recurring-charge-${bookingId}-${tomorrowUtc}\` })`
     - On success (PI status `requires_capture`): update booking `status='confirmed'`, `stripe_payment_intent=pi.id` via `.eq('id', bookingId).eq('status', 'requested')` (idempotent)
     - On Stripe error (catch block): update booking `status='payment_failed'` via `.eq('id', bookingId).eq('status', 'requested')`, then fire-and-forget `sendRecurringPaymentFailedEmail({ bookingId })`
   - Return `Response.json({ charged, failed, skipped, checked: sessions.length })`
   - Import: `Stripe` from 'stripe', `supabaseAdmin` from '@/lib/supabase/service', `computeSessionAmount` from '@/lib/utils/booking', `sendRecurringPaymentFailedEmail` from '@/lib/email'

4. Update `vercel.json` — add 4th cron entry:
   ```json
   { "path": "/api/cron/recurring-charges", "schedule": "0 12 * * *" }
   ```

5. Create `src/__tests__/recurring-charges.test.ts` with 6-8 tests following the `reminders.test.ts` pattern:
   - **401 without CRON_SECRET**: GET without auth header → 401
   - **No-op when no sessions tomorrow**: Mock query returns empty array → `{ charged: 0, failed: 0, skipped: 0, checked: 0 }`
   - **Successful charge path**: Mock session with valid PM → PI created with correct params (off_session, confirm, capture_method, idempotencyKey) → booking updated to confirmed → `{ charged: 1 }`
   - **Failed charge path**: Mock Stripe PI create throws error → booking updated to payment_failed → sendRecurringPaymentFailedEmail called → `{ failed: 1 }`
   - **Skips null payment_method**: Mock session with `stripe_payment_method_id: null` → `{ skipped: 1 }`, no PI created
   - **Idempotency — second run skips confirmed session**: The cron query filters `status='requested'` so already-confirmed sessions are not returned. Test that query includes `.eq('status', 'requested')`
   - **Application fee calculated at 7%**: Verify PI create called with `application_fee_amount: Math.round(amount * 0.07)`
   - Use `vi.hoisted` for MockStripeClass (same pattern as webhook-capture.test.ts and create-recurring.test.ts)
   - Mock `@/lib/email` to prevent Resend constructor error (established pattern from S01)
   - Mock `@/lib/supabase/service` with chainable Supabase mock

## Must-Haves

- [ ] RecurringPaymentFailedEmail renders for both parent and teacher variants
- [ ] sendRecurringPaymentFailedEmail added to email.ts following sendCancellationEmail pattern
- [ ] Cron route auth-gated on CRON_SECRET
- [ ] Cron queries non-first recurring bookings for tomorrow with status='requested'
- [ ] Stripe PI created with off_session:true, confirm:true, capture_method:'manual', idempotencyKey
- [ ] Successful charge → booking confirmed + PI ID stored
- [ ] Failed charge → booking payment_failed + email notification sent
- [ ] Null payment_method sessions skipped (not charged)
- [ ] vercel.json includes /api/cron/recurring-charges at 0 12 * * *
- [ ] All tests pass, tsc clean, build succeeds

## Verification

- `npx vitest run recurring-charges --reporter=verbose` — all tests pass
- `npx tsc --noEmit` — 0 type errors
- `npm run build` — production build succeeds, `/api/cron/recurring-charges` in route manifest

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Stripe paymentIntents.create | Catch error, mark booking payment_failed, send notification email | Stripe SDK has default timeout; booking marked payment_failed | Unexpected PI status logged as warning, booking left as requested for next cron run |
| Supabase booking query | Return empty result, cron processes 0 sessions | Supabase client timeout; cron returns { checked: 0 } | Log error, return 500 |
| sendRecurringPaymentFailedEmail | Fire-and-forget catch — email failure does not affect booking status update | Same — fire-and-forget | Same |

## Load Profile

- **Shared resources**: Stripe API (rate-limited per account), Supabase connection pool
- **Per-operation cost**: 1 Supabase query to find sessions + N Stripe PI creates + N Supabase updates + M email sends (where N = sessions, M = failed sessions)
- **10x breakpoint**: Stripe rate limit (25 req/s test, 10K/s live) — unlikely to hit with daily cron. Supabase pool exhaustion at ~100+ concurrent queries — sequential processing avoids this.

## Negative Tests

- **No CRON_SECRET**: Returns 401, no processing
- **No sessions for tomorrow**: Returns { charged: 0, ... }, no Stripe calls
- **Null payment_method**: Skipped, not charged, not failed
- **Stripe card_declined / authentication_required / expired_card errors**: All map to payment_failed status
- **Double cron invocation**: Idempotency key prevents double Stripe charge; `.eq('status', 'requested')` prevents double DB update

## Observability Impact

- Signals added: `[recurring-charges] Charged booking {id}`, `[recurring-charges] Payment failed for booking {id}: {code}`, `[recurring-charges] Skipped booking {id} — no payment method`
- Response JSON: `{ charged, failed, skipped, checked }` for Vercel cron monitoring
- Failure state: booking.status = 'payment_failed' queryable in Supabase; Stripe error code logged

## Inputs

- ``src/emails/CancellationEmail.tsx` — template to follow for RecurringPaymentFailedEmail styling/structure`
- ``src/lib/email.ts` — add sendRecurringPaymentFailedEmail following sendCancellationEmail pattern`
- ``src/app/api/cron/session-reminders/route.ts` — cron auth + idempotency pattern to follow`
- ``src/__tests__/reminders.test.ts` — cron test pattern (vi.hoisted, chainable Supabase mock)`
- ``src/lib/utils/booking.ts` — computeSessionAmount import for hourly rate fallback`
- ``src/__tests__/webhook-capture.test.ts` — MockStripeClass vi.hoisted pattern to reuse`
- ``supabase/migrations/0015_payment_failed_status.sql` — confirms payment_failed is a valid status (from T01)`
- ``src/app/api/stripe/webhook/route.ts` — confirms webhook stores stripe_payment_method_id (from T01)`
- ``vercel.json` — existing cron entries to add 4th entry to`

## Expected Output

- ``src/emails/RecurringPaymentFailedEmail.tsx` — new React Email template for payment failure notification`
- ``src/lib/email.ts` — extended with sendRecurringPaymentFailedEmail function`
- ``src/app/api/cron/recurring-charges/route.ts` — new cron route for daily recurring auto-charge`
- ``vercel.json` — updated with 4th cron entry for /api/cron/recurring-charges`
- ``src/__tests__/recurring-charges.test.ts` — 6-8 integration tests for the cron route`

## Verification

npx vitest run recurring-charges --reporter=verbose && npx tsc --noEmit && npm run build
