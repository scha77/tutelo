# S02 Research: Saved Cards & Auto-Charge Cron

**Slice:** M009/S02  
**Researched:** 2026-03-31  
**Depth:** Targeted — Stripe off-session charging is the only novel surface; everything else applies established codebase patterns.

---

## Summary

S02 delivers three connected mechanisms: (1) the Stripe webhook stores the payment method after the parent confirms the first-session PI, (2) a new daily cron charges non-first recurring sessions 24h before they occur, and (3) failed charges update booking status to a new `payment_failed` state and notify both parties. All three are extensions of existing patterns.

**Key validation concern for RECUR-06/07:** `stripe_payment_method_id` on `recurring_schedules` is currently NULL after S01 completes (S01 known limitation #3). The webhook extension in this slice is the mechanism that populates it. The cron depends on that field being non-NULL before any sessions need charging.

---

## Implementation Landscape

### What Exists

**recurring_schedules table** (`supabase/migrations/0014_recurring_schedules.sql`)  
Has `stripe_customer_id TEXT` (populated by create-recurring) and `stripe_payment_method_id TEXT` (NULL after S01 — populated by S02 webhook).

**bookings table** (migration 0001)  
`status` CHECK constraint: `('requested','pending','confirmed','completed','cancelled')`. No `payment_failed` value yet.  
Has `stripe_payment_intent TEXT`, `is_recurring_first BOOLEAN`, `recurring_schedule_id UUID`.

**Stripe webhook handler** (`src/app/api/stripe/webhook/route.ts`)  
Handles `payment_intent.amount_capturable_updated`. On this event:
- Updates booking to `status='confirmed'` (idempotent via `.eq('status', 'requested')`)
- Stores `stripe_payment_intent = pi.id`
- Fires `sendBookingConfirmationEmail`

The `pi` object carries `pi.metadata.recurring_schedule_id` (set in create-recurring) and `pi.payment_method` (populated by Stripe after confirmPayment). Neither is currently used to update `recurring_schedules`. **S02 must extend this handler.**

**Three existing cron routes** (`vercel.json`):
- `/api/cron/auto-cancel` — `0 9 * * *`
- `/api/cron/stripe-reminders` — `0 10 * * *` (has "requires Pro" comment)
- `/api/cron/session-reminders` — `0 14 * * *` (reminders for confirmed sessions)

**Vercel cron limit update (Jan 2026):** Per-project limit lifted to 100 on all plans. Hobby still runs each cron at most once per day. **We can add a 4th daily cron.** D013's constraint ("extend existing cron, don't add a second") is now obsolete given the limit change — a dedicated `/api/cron/recurring-charges` route is cleaner and avoids coupling with the reminder cron.

**session-reminders cron** (`src/app/api/cron/session-reminders/route.ts`)  
Idempotency pattern: conditional `.is('reminder_sent_at', null)` update; only notifies if the update claim succeeds. This is the pattern S02's cron should follow.

**PaymentStep component** (`src/components/profile/PaymentStep.tsx`)  
Uses `stripe.confirmPayment()` with `redirect: 'if_required'`. After confirmation, Stripe fires `payment_intent.amount_capturable_updated` on the platform (because `capture_method: 'manual'`). This is how the webhook gets the PI object with `payment_method` populated.

### What Must Be Built

**1. Migration: `supabase/migrations/0015_payment_failed_status.sql`**  
Add `'payment_failed'` to the booking status CHECK constraint via `ALTER TABLE bookings DROP CONSTRAINT ... ADD CONSTRAINT ... CHECK (status IN ('requested','pending','confirmed','completed','cancelled','payment_failed'))`.  
Rationale: `'cancelled'` semantically means teacher or parent cancelled. `'payment_failed'` is a distinct state needed for S03 UX (show a payment retry prompt, not a cancellation message).

**2. Webhook extension** (`src/app/api/stripe/webhook/route.ts`)  
In the `payment_intent.amount_capturable_updated` case, after the idempotent booking update, add:
```typescript
const recurringScheduleId = pi.metadata?.recurring_schedule_id
if (recurringScheduleId && pi.payment_method) {
  await supabaseAdmin
    .from('recurring_schedules')
    .update({ stripe_payment_method_id: pi.payment_method as string })
    .eq('id', recurringScheduleId)
    .is('stripe_payment_method_id', null) // idempotent
}
```
This is a fire-and-forget add-on — the main booking confirmation path is unchanged. The `.is('stripe_payment_method_id', null)` guard ensures idempotency on webhook re-delivery.

**3. Recurring charges cron** (`src/app/api/cron/recurring-charges/route.ts`)  
Schedule: `0 12 * * *` (noon UTC). Runs 2h before session-reminders, so confirmed sessions are ready for reminder pickup at 14:00.

Query: non-first recurring bookings for tomorrow UTC where status = 'requested':
```typescript
const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const { data: sessions } = await supabaseAdmin
  .from('bookings')
  .select(`
    id, teacher_id, parent_email, student_name, booking_date, start_time, end_time,
    recurring_schedule_id,
    recurring_schedules!inner(
      stripe_customer_id, stripe_payment_method_id,
      teachers!inner(stripe_account_id, hourly_rate, full_name, social_email)
    ),
    session_types(price)
  `)
  .eq('booking_date', tomorrowUtc)
  .eq('status', 'requested')
  .eq('is_recurring_first', false)
  .not('recurring_schedule_id', 'is', null)
```

For each session:
- Skip if `recurring_schedules.stripe_payment_method_id` is null (not yet confirmed by parent — edge case for very recent bookings)
- Compute `amountInCents` (session_type price or hourly proration via `computeSessionAmount`)
- `stripe.paymentIntents.create({ amount, currency:'usd', customer, payment_method, off_session:true, confirm:true, capture_method:'manual', transfer_data:{ destination: stripe_account_id }, application_fee_amount, metadata:{ booking_id, teacher_id, recurring_schedule_id } })`
- On success (status = `requires_capture`): update booking `status='confirmed'`, `stripe_payment_intent=pi.id` directly (don't wait for webhook — the webhook will no-op idempotently)
- On Stripe error: update booking `status='payment_failed'`, fire `sendRecurringPaymentFailedEmail` (fire-and-forget)

**Idempotency:** Use Stripe `idempotencyKey: \`recurring-charge-${bookingId}-${tomorrowUtc}\`` so Vercel double-invocations don't double-charge. Also gate the booking update on `.eq('status', 'requested')` so a second cron run skips already-processed sessions.

**4. vercel.json** — add 4th entry:
```json
{ "path": "/api/cron/recurring-charges", "schedule": "0 12 * * *" }
```

**5. Email: `src/emails/RecurringPaymentFailedEmail.tsx`**  
Parent variant: "Your payment of $X for [student]'s tutoring session on [date] failed. Please update your payment method at [accountUrl]."  
Teacher variant: "The automatic payment for [student]'s session on [date] failed. We'll notify you if it's resolved."  
Follow existing email template structure from `CancellationEmail.tsx`.

**6. `src/lib/email.ts`** — add `sendRecurringPaymentFailedEmail(params)` following the `sendRecurringBookingConfirmationEmail` pattern (both variants in one function, fire teacher email only if social_email set).

**7. Tests: `src/__tests__/recurring-charges.test.ts`**  
Cover: auth guard (401), no-op when no sessions, successful charge path (PI creates, booking confirmed), failed charge path (payment_failed status, email called), idempotency (second run skips confirmed session), null payment_method skip.

**8. Tests: extend `src/__tests__/webhook-capture.test.ts`**  
Add: recurring_schedule_id in metadata → updates recurring_schedules.stripe_payment_method_id; no-op when recurring_schedule_id absent; idempotent re-delivery skips update.

---

## Technical Constraints & Gotchas

**off_session + confirm:true + capture_method:'manual'**  
Confirmed valid per Stripe docs: "If payment succeeds... the PaymentIntent will transition to `requires_capture`, if `capture_method` is set to `manual`." The cron should expect `pi.status === 'requires_capture'` on success, not `'succeeded'`.

**3DS/authentication_required errors**  
When off_session charging fails because 3DS is required, Stripe throws a Stripe error with `code: 'authentication_required'` and `payment_intent.status = 'requires_action'`. The parent is not present to authenticate. Mark booking `payment_failed` and notify. Do NOT attempt to surface a re-auth flow — just notify both parties.  
Other failure codes: `card_declined`, `insufficient_funds`, `expired_card` — all mark `payment_failed`.

**Destination charge compatibility**  
`transfer_data + application_fee_amount + off_session + confirm:true` is the same as the first session PI minus `setup_future_usage`. Stripe supports all these together.

**stripe_payment_method_id race condition**  
Sessions created today for next week start with `stripe_payment_method_id = NULL`. By the time the cron runs for them (e.g., 7 days later), the parent will have confirmed their first session and the webhook will have populated the field. The skip logic (`if !stripe_payment_method_id`) handles the edge case where a newly-created series has its first session within the next 24h and the parent hasn't confirmed yet — that session gets skipped and the teacher should confirm manually.

**Payment_method attached to Stripe Customer**  
After `setup_future_usage: 'off_session'` + `confirmPayment`, Stripe automatically attaches the payment method to the Customer. The PI's `payment_method` field (in the webhook event) is the PM ID. `stripe.customers.listPaymentMethods(customerId)` is an alternative lookup but unnecessary given we store the PM ID directly.

**Vercel cron timing precision**  
Hobby plan: crons may fire anywhere within the specified hour (not minute-precise). The charge cron at `0 12 * * *` may fire between 12:00–12:59 UTC. This is fine — "24h before" charging doesn't need second-level precision.

**Status constraint migration approach**  
PostgreSQL CHECK constraints: need to drop and re-add. Pattern in 0001: the constraint is inline. Migration 0015 should:
```sql
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('requested','pending','confirmed','completed','cancelled','payment_failed'));
```
Note: the constraint name must be checked — it may be auto-generated. Use `\d bookings` or `information_schema.table_constraints` to verify. Alternative: use a migration that simply adds the value to the check.

---

## Task Decomposition Recommendation

**T01 — Migration + Webhook Extension** (~45 min)  
- `supabase/migrations/0015_payment_failed_status.sql`: add `payment_failed` to status enum
- Extend `src/app/api/stripe/webhook/route.ts` `amount_capturable_updated` case to store `stripe_payment_method_id` on `recurring_schedules`
- Extend `src/__tests__/webhook-capture.test.ts` with 3 new cases
- Verify: `npx vitest run webhook-capture --reporter=verbose`

**T02 — Cron Route + vercel.json** (~60 min)  
- Create `src/app/api/cron/recurring-charges/route.ts` with full charge + failure handling logic
- Update `vercel.json` with 4th cron entry
- Create `src/__tests__/recurring-charges.test.ts` with 6–8 tests
- Verify: `npx vitest run recurring-charges --reporter=verbose`

**T03 — Email Templates + Integration** (~30 min)  
- Create `src/emails/RecurringPaymentFailedEmail.tsx`
- Add `sendRecurringPaymentFailedEmail` to `src/lib/email.ts`
- Wire into cron route (replace stub)
- Verify: `npx tsc --noEmit` + `npm run build`

This 3-task split allows T01 and T02 to be developed in parallel (they touch different files) and T03 wires everything together.

---

## Forward Intelligence

- **The webhook fires for cron-created PIs too.** The same `payment_intent.amount_capturable_updated` handler runs for recurring auto-charged sessions. With `capture_method:'manual'`, off-session PIs created by the cron also fire `amount_capturable_updated`. The cron will have already set booking to `confirmed` — the webhook hits `eq('status', 'requested')` and no-ops. No change to webhook needed beyond T01.
- **S03 depends on `payment_failed` status.** The cancellation UI in S03 needs to handle `payment_failed` sessions differently from `cancelled` sessions. Don't use `'cancelled'` for charge failures.
- **Session-reminders cron is unchanged.** It queries `status='confirmed'`, so it will automatically pick up recurring sessions that were charged successfully. No modification needed.
- **The first-session booking doesn't go through this cron.** `is_recurring_first = true` bookings are excluded by the cron query. They are handled by the existing direct-booking flow (parent manually confirms). The cron only processes `is_recurring_first = false` sessions.
- **computeSessionAmount import pattern.** Already used in create-recurring — import from `@/lib/utils/booking` for the hourly rate fallback path in the cron.
- **Stripe idempotency key format.** Use `{ idempotencyKey: \`recurring-charge-${bookingId}-${tomorrowUtc}\` }` as the 2nd argument to `stripe.paymentIntents.create()`. This is the Stripe Node.js v20 pattern for idempotency.
