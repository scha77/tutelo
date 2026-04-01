# S03: Saved Payment Methods

**Goal:** Parent books a session, card is auto-saved to their Stripe Customer. On next booking, parent sees "Pay with saved card" via Stripe's PaymentElement and completes checkout in one click. Parent can view and remove their saved card from /parent/payment.
**Demo:** After this: Parent books a session, card is auto-saved to their Stripe Customer. On next booking, parent sees Pay with saved card and completes checkout in one click

## Tasks
- [x] **T01: Created parent_profiles table, wired Stripe Customer creation/reuse into both booking routes, and added PM card detail upsert to webhook handler** — ## Description

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
  - Estimate: 1h30m
  - Files: supabase/migrations/0018_parent_profiles.sql, src/app/api/direct-booking/create-intent/route.ts, src/app/api/direct-booking/create-recurring/route.ts, src/app/api/stripe/webhook/route.ts
  - Verify: npx tsc --noEmit && test -f supabase/migrations/0018_parent_profiles.sql && grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts && grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts && grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts && grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts && npx vitest run
- [x] **T02: Created GET/DELETE API routes for saved payment methods and a /parent/payment page with card display, remove action, and Payment nav item** — ## Description

Creates the parent-facing surfaces for viewing and removing saved payment methods: a GET/DELETE API route at `/api/parent/payment-method` and a `/parent/payment` dashboard page. Also adds the Payment nav item to `parentNavItems` so both sidebar and mobile nav show it.

The GET route returns only safe display fields (brand, last4, exp). The DELETE route detaches the PM from Stripe and clears the card fields on parent_profiles. The page is a server component that queries parent_profiles via supabaseAdmin.

## Steps

1. Create `src/app/api/parent/payment-method/route.ts`:
   - `GET`: `getUser()` auth guard → query `parent_profiles` via `supabaseAdmin` for `user.id` → return `{ card_brand, card_last4, card_exp_month, card_exp_year }` or `{ card: null }` if no row/no PM
   - `DELETE`: `getUser()` auth guard → fetch `parent_profiles` for `user.id` → if no `stripe_payment_method_id` return 404 → `stripe.paymentMethods.detach(stripe_payment_method_id)` → update `parent_profiles` to null out `stripe_payment_method_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year` → return 200
   - Import Stripe only in DELETE handler (GET doesn't need it)

2. Create `src/app/(parent)/parent/payment/page.tsx`:
   - Server component with `getUser()` auth guard (redirect to `/login?redirect=/parent/payment` if no session)
   - Query `parent_profiles` via supabaseAdmin for card fields
   - If card exists: show Card component with brand icon/name, `•••• {last4}`, `Expires {month}/{year}`, and a "Remove Card" button
   - If no card: show empty state explaining that cards are auto-saved on first booking with a link to find a tutor
   - "Remove Card" button triggers fetch DELETE to `/api/parent/payment-method` then router.refresh()
   - Use `'use client'` wrapper for the remove-card interaction (small client component inside server page, or make the whole page client)

3. Update `src/lib/parent-nav.ts`:
   - Import `CreditCard` from lucide-react
   - Add `{ href: '/parent/payment', label: 'Payment', icon: CreditCard }` to `parentNavItems` array (after My Bookings)

## Must-Haves

- [ ] GET /api/parent/payment-method returns card display fields for authenticated parent
- [ ] GET returns 401 for unauthenticated requests
- [ ] GET returns `{ card: null }` when no saved card
- [ ] DELETE /api/parent/payment-method detaches PM via Stripe and clears parent_profiles
- [ ] DELETE returns 401 for unauthenticated, 404 when no saved card
- [ ] /parent/payment page renders saved card or empty state
- [ ] Payment nav item appears in parentNavItems with CreditCard icon
- [ ] `npx tsc --noEmit` passes

## Verification

- `npx tsc --noEmit` exits 0
- `test -f src/app/api/parent/payment-method/route.ts`
- `test -f src/app/(parent)/parent/payment/page.tsx`
- `grep -q 'CreditCard' src/lib/parent-nav.ts`
- `grep -q 'payment' src/lib/parent-nav.ts`
- `npx vitest run` — full suite passes (no regressions)
  - Estimate: 1h
  - Files: src/app/api/parent/payment-method/route.ts, src/app/(parent)/parent/payment/page.tsx, src/lib/parent-nav.ts
  - Verify: npx tsc --noEmit && test -f src/app/api/parent/payment-method/route.ts && test -f src/app/(parent)/parent/payment/page.tsx && grep -q 'CreditCard' src/lib/parent-nav.ts && npx vitest run
- [x] **T03: Created saved-payment-methods.test.ts with 18 tests covering create-intent Customer attachment, create-recurring Customer reuse, webhook PM upsert, and GET/DELETE payment-method API routes** — ## Description

Creates `src/__tests__/saved-payment-methods.test.ts` with 15+ unit tests covering all new and modified code paths from T01 and T02. Tests follow the established mock patterns from `payment-intent.test.ts` and `parent-children.test.ts` — vi.hoisted for Stripe mocks, vi.mock for supabase server/service.

This is the verification task that proves the slice works correctly at the unit level.

## Negative Tests

- Unauthenticated requests to GET/DELETE payment-method → 401
- DELETE when no saved card exists → 404
- Webhook PI with no parent_id metadata → skips PM upsert without error
- Webhook PI with no payment_method → skips PM upsert without error
- create-intent with existing parent_profiles Customer → reuses, doesn't create new

## Steps

1. Create `src/__tests__/saved-payment-methods.test.ts` with the following test groups:

   **create-intent Customer attachment (4-5 tests):**
   - When parent has no parent_profiles row → creates Stripe Customer, upserts to parent_profiles, PI includes `customer` + `setup_future_usage: 'off_session'`
   - When parent has existing stripe_customer_id in parent_profiles → reuses Customer, no `stripe.customers.create()` call
   - PI metadata includes `parent_id: user.id`
   - Backward compat: existing PI creation params (capture_method, transfer_data, etc.) still present

   **create-recurring Customer reuse (3-4 tests):**
   - When parent has existing parent_profiles Customer → reuses it, no new Customer created
   - When parent has no parent_profiles row → creates Customer, upserts to parent_profiles AND recurring_schedules
   - Still stores customer on recurring_schedules for cron backward compat

   **Webhook PM upsert (3-4 tests):**
   - PI with customer + payment_method + parent_id metadata → calls paymentMethods.retrieve, upserts card details to parent_profiles
   - PI with no parent_id in metadata (pre-S03 booking) → skips PM upsert, no error
   - PI with no payment_method → skips PM upsert
   - Idempotent: second webhook delivery with same PM data → upsert succeeds without error

   **GET /api/parent/payment-method (3 tests):**
   - Authenticated parent with saved card → returns card_brand, card_last4, card_exp_month, card_exp_year
   - Authenticated parent with no parent_profiles row → returns { card: null }
   - Unauthenticated → 401

   **DELETE /api/parent/payment-method (3 tests):**
   - Authenticated with saved card → calls stripe.paymentMethods.detach, clears card fields on parent_profiles, returns 200
   - Authenticated with no saved card → 404
   - Unauthenticated → 401

2. Use the established mock patterns:
   - `vi.hoisted()` for Stripe mock class with `customers.create`, `paymentIntents.create`, `paymentMethods.retrieve`, `paymentMethods.detach`
   - `vi.mock('@/lib/supabase/server')` for `createClient` returning mock auth
   - `vi.mock('@/lib/supabase/service')` for `supabaseAdmin` with chainable `.from().select().eq().maybeSingle()` etc.
   - Use `vi.mock('@/lib/utils/booking')` and `vi.mock('@/lib/email')` to stub non-Stripe dependencies in route tests

3. Run the full test suite to verify no regressions.

## Must-Haves

- [ ] 15+ tests covering all test groups above
- [ ] All tests pass: `npx vitest run src/__tests__/saved-payment-methods.test.ts`
- [ ] Full suite passes: `npx vitest run` with zero regressions
- [ ] Tests use established vi.hoisted + vi.mock patterns (no novel mock approaches)

## Verification

- `npx vitest run src/__tests__/saved-payment-methods.test.ts` — all tests pass
- `npx vitest run` — full suite passes with zero regressions
- `grep -c 'it(' src/__tests__/saved-payment-methods.test.ts` returns >= 15
  - Estimate: 1h30m
  - Files: src/__tests__/saved-payment-methods.test.ts
  - Verify: npx vitest run src/__tests__/saved-payment-methods.test.ts && npx vitest run
