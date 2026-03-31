---
estimated_steps: 40
estimated_files: 3
skills_used: []
---

# T01: Migration + Webhook extension to store payment method

Add `payment_failed` to the bookings status CHECK constraint via a new migration, and extend the Stripe webhook's `payment_intent.amount_capturable_updated` handler to store the payment method ID on the recurring_schedules row. This is the foundation for T02 — the cron needs `stripe_payment_method_id` to be non-NULL before it can auto-charge.

## Steps

1. Create `supabase/migrations/0015_payment_failed_status.sql`:
   - `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;`
   - `ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('requested','pending','confirmed','completed','cancelled','payment_failed'));`
   - The constraint name is `bookings_status_check` based on the inline CHECK in migration 0001.

2. Extend `src/app/api/stripe/webhook/route.ts` — in the `payment_intent.amount_capturable_updated` case, after the existing idempotent booking update block, add:
   ```typescript
   // Store payment method on recurring schedule for S02 auto-charge
   const recurringScheduleId = pi.metadata?.recurring_schedule_id
   if (recurringScheduleId && pi.payment_method) {
     await supabaseAdmin
       .from('recurring_schedules')
       .update({ stripe_payment_method_id: pi.payment_method as string })
       .eq('id', recurringScheduleId)
       .is('stripe_payment_method_id', null) // idempotent — only set once
   }
   ```
   This is a fire-and-forget add-on — the main booking confirmation path is unchanged. The `.is('stripe_payment_method_id', null)` guard ensures idempotency on webhook re-delivery.

3. Add 3 new test cases to `src/__tests__/webhook-capture.test.ts`:
   - **recurring_schedule_id in metadata → updates recurring_schedules.stripe_payment_method_id**: Mock PI with `metadata: { booking_id, recurring_schedule_id }` and `payment_method: 'pm_test'`. Verify `supabaseAdmin.from('recurring_schedules').update({ stripe_payment_method_id: 'pm_test' })` is called with `.eq('id', recurringScheduleId).is('stripe_payment_method_id', null)`.
   - **no-op when recurring_schedule_id absent**: Mock PI with `metadata: { booking_id }` only (no recurring_schedule_id). Verify no call to `from('recurring_schedules')`.
   - **idempotent re-delivery skips update**: Same as first test but verify the `.is('stripe_payment_method_id', null)` guard is applied.

## Must-Haves

- [ ] Migration 0015 adds `payment_failed` to bookings status CHECK
- [ ] Webhook stores `stripe_payment_method_id` on recurring_schedules when PI metadata includes `recurring_schedule_id`
- [ ] `.is('stripe_payment_method_id', null)` idempotency guard on the update
- [ ] 3 new webhook tests pass
- [ ] Existing 5 webhook tests still pass (no regression)

## Verification

- `npx vitest run webhook-capture --reporter=verbose` — all 8 tests pass (5 existing + 3 new)
- `npx tsc --noEmit` — 0 type errors

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase recurring_schedules update | Log warning, do not fail webhook (200 returned regardless) | Supabase client has default timeout; webhook still returns 200 | Silently ignored — fire-and-forget |

## Negative Tests

- **Missing recurring_schedule_id**: PI metadata has only booking_id → no recurring_schedules update attempted
- **Missing payment_method**: PI has recurring_schedule_id but payment_method is null → no update attempted
- **Re-delivery**: Second webhook delivery with same PI → `.is('stripe_payment_method_id', null)` returns 0 rows, no-op

## Inputs

- ``supabase/migrations/0001_initial_schema.sql` — current bookings status CHECK constraint to extend`
- ``src/app/api/stripe/webhook/route.ts` — existing webhook handler to extend with recurring_schedules update`
- ``src/__tests__/webhook-capture.test.ts` — existing 5 tests to add 3 new cases to`

## Expected Output

- ``supabase/migrations/0015_payment_failed_status.sql` — new migration adding payment_failed to bookings status CHECK`
- ``src/app/api/stripe/webhook/route.ts` — extended with recurring_schedules.stripe_payment_method_id update`
- ``src/__tests__/webhook-capture.test.ts` — 8 total tests (5 existing + 3 new recurring PM tests)`

## Verification

npx vitest run webhook-capture --reporter=verbose && npx tsc --noEmit
