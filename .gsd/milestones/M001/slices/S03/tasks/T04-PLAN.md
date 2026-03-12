# T04: 03-stripe-connect-deferred-payment 04

**Slice:** S03 — **Milestone:** M001

## Description

Fix the Supabase JS v2 `count` bug in the auto-cancel cron that silently prevents cancellation emails from ever being sent.

Purpose: STRIPE-04 and NOTIF-05 are currently partial — the DB update to `cancelled` works correctly but the email notification is never dispatched. The root cause is that Supabase JS v2 `.update()` returns `count: null` unless an explicit count preference header is sent. The idempotency guard `if (count && count > 0)` is always false, so `sendCancellationEmail` is never called.

Output: `src/app/api/cron/auto-cancel/route.ts` with `.select('id')` chained to the update and the guard rewritten to check `updated && updated.length > 0`.

## Must-Haves

- [ ] "When the auto-cancel cron runs and updates a booking status to cancelled, sendCancellationEmail is called for every row that was actually changed"
- [ ] "Running the auto-cancel cron twice for the same booking does not send a duplicate cancellation email (idempotency preserved)"
- [ ] "The cancelled counter in the cron response JSON reflects the actual number of bookings cancelled, not always zero"

## Files

- `src/app/api/cron/auto-cancel/route.ts`
