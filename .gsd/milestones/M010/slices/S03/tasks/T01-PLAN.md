---
estimated_steps: 53
estimated_files: 4
skills_used: []
---

# T01: Create parent_profiles migration and wire Stripe Customer into both booking routes

## Description

This task creates the `parent_profiles` table (migration 0018) and modifies both direct-booking routes (`create-intent` and `create-recurring`) to create/reuse a parent-level Stripe Customer stored in `parent_profiles`. It also updates the webhook to retrieve PM card details and upsert them to `parent_profiles` after successful payment authorization.

This is the core integration work — the migration and all three route modifications are tightly coupled (webhook reads what routes write, both routes share the same parent_profiles lookup pattern) so they ship together.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|---|---|---|---|
| `stripe.customers.create()` | Return 502, clean up booking row (existing pattern) | Same as error — Stripe SDK has built-in timeout | N/A — Stripe SDK types enforce shape |
| `stripe.paymentMethods.retrieve()` | Log error, skip PM upsert — booking confirm still succeeds | Same — log + skip | Log warning, skip upsert |
| `supabaseAdmin.upsert()` on parent_profiles | Log error — non-fatal for booking flow | Same | N/A — typed client |

## Negative Tests

- Webhook receives PI with no `parent_id` in metadata (pre-S03 bookings) → skip PM upsert gracefully
- Webhook receives PI with no `payment_method` → skip PM upsert
- `create-intent` with user who has no `parent_profiles` row yet → creates Customer + inserts row
- `create-recurring` with user who already has a Customer → reuses it, does not create duplicate

## Steps

1. Create `supabase/migrations/0018_parent_profiles.sql` with the parent_profiles table: `user_id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE`, `stripe_customer_id TEXT`, `stripe_payment_method_id TEXT`, `card_brand TEXT`, `card_last4 TEXT`, `card_exp_month SMALLINT`, `card_exp_year SMALLINT`, `updated_at TIMESTAMPTZ DEFAULT NOW()`. Enable RLS with owner-all policy (`user_id = auth.uid()`).

2. Modify `src/app/api/direct-booking/create-intent/route.ts`:
   - After teacher fetch and before PI creation, query `parent_profiles` for `user.id` to get existing `stripe_customer_id`
   - If no customer: `stripe.customers.create({ email: user.email, metadata: { tutelo_user_id: user.id } })` then `supabaseAdmin.from('parent_profiles').upsert({ user_id: user.id, stripe_customer_id: customer.id }, { onConflict: 'user_id' })`
   - Add `customer: customerId` and `setup_future_usage: 'off_session'` to `stripe.paymentIntents.create()` params
   - Add `parent_id: user.id` to PI metadata object

3. Modify `src/app/api/direct-booking/create-recurring/route.ts`:
   - Before the existing `stripe.customers.create()` call, query `parent_profiles` for `user.id`
   - If `parent_profiles.stripe_customer_id` exists, reuse it instead of creating new Customer
   - If no row/no customer, create Customer as before, then upsert to `parent_profiles`
   - Keep storing `customer.id` on `recurring_schedules.stripe_customer_id` for backward compatibility with cron
   - Add `parent_id: user.id` to PI metadata

4. Modify `src/app/api/stripe/webhook/route.ts` in the `payment_intent.amount_capturable_updated` handler:
   - After existing booking confirm logic, check if `pi.customer` and `pi.payment_method` and `pi.metadata?.parent_id` are all present
   - If yes: `const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string)` 
   - Extract `pm.card?.brand`, `pm.card?.last4`, `pm.card?.exp_month`, `pm.card?.exp_year`
   - `supabaseAdmin.from('parent_profiles').upsert({ user_id: parentId, stripe_customer_id: pi.customer as string, stripe_payment_method_id: pi.payment_method as string, card_brand, card_last4, card_exp_month, card_exp_year, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })`
   - Wrap in try/catch — log errors but don't fail the webhook response (PM storage is non-critical)

## Must-Haves

- [ ] Migration 0018 creates parent_profiles with correct schema and RLS
- [ ] create-intent attaches Customer + setup_future_usage + parent_id metadata
- [ ] create-recurring reuses parent-level Customer from parent_profiles
- [ ] Webhook retrieves PM details and upserts to parent_profiles
- [ ] All changes are backward-compatible (pre-S03 bookings without parent_id in metadata are handled gracefully)
- [ ] `npx tsc --noEmit` passes

## Verification

- `npx tsc --noEmit` exits 0
- `test -f supabase/migrations/0018_parent_profiles.sql`
- `grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts`
- `grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts`
- `grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts`
- `grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts`
- `grep -q 'parent_profiles' src/app/api/stripe/webhook/route.ts`
- `npx vitest run` — full suite passes (no regressions in existing 426 tests)

## Observability Impact

- Signals added: `console.log` on successful parent_profiles Customer creation and PM upsert in webhook; `console.error` on Stripe PM retrieve failure
- How a future agent inspects: query `parent_profiles` table by user_id; check webhook logs for PM storage messages
- Failure state exposed: webhook logs include PI ID and parent_id on PM upsert failure

## Inputs

- ``src/app/api/direct-booking/create-intent/route.ts` — existing direct booking PI creation (no customer, no setup_future_usage)`
- ``src/app/api/direct-booking/create-recurring/route.ts` — existing recurring booking with per-schedule Customer creation`
- ``src/app/api/stripe/webhook/route.ts` — existing webhook handler for payment_intent.amount_capturable_updated`
- ``src/lib/supabase/service.ts` — supabaseAdmin service role client`

## Expected Output

- ``supabase/migrations/0018_parent_profiles.sql` — new migration creating parent_profiles table with RLS`
- ``src/app/api/direct-booking/create-intent/route.ts` — modified to attach Customer + setup_future_usage + parent_id metadata`
- ``src/app/api/direct-booking/create-recurring/route.ts` — modified to reuse parent-level Customer from parent_profiles`
- ``src/app/api/stripe/webhook/route.ts` — modified to retrieve PM details and upsert to parent_profiles`

## Verification

npx tsc --noEmit && test -f supabase/migrations/0018_parent_profiles.sql && grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts && grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts && grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts && grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts && npx vitest run
