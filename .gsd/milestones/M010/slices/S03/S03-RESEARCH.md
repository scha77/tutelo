# S03 Research: Saved Payment Methods

**Slice:** S03 — Saved Payment Methods  
**Milestone:** M010  
**Requirements:** PARENT-05, PARENT-09  
**Depth:** Targeted — Stripe patterns are used in the codebase, but parent-level Customer storage is new

---

## Summary

S03 is additive Stripe plumbing. The codebase already uses Stripe Customer + `setup_future_usage: 'off_session'` in `create-recurring`. The direct-booking path (`create-intent`) does not yet create a Customer. There is no parent-level Stripe Customer storage anywhere — `recurring_schedules.stripe_customer_id` is per-schedule. The whole slice is: add a `parent_profiles` table to hold the parent-level Customer + saved PM, thread it into both booking paths, surface card details in the webhook, and build a dashboard page.

Stripe's `PaymentElement` with a Customer attached to the PI **automatically shows the saved card pre-selected on subsequent bookings** — no custom "saved card" UI is needed inside `BookingCalendar`. The "one click" experience described in the roadmap vision is Stripe's built-in saved-card UX via `PaymentElement`.

---

## Current State

### Stripe Customer Usage
| Location | Customer | setup_future_usage | Notes |
|---|---|---|---|
| `create-intent` | ❌ None | ❌ None | Purely stateless PI |
| `create-recurring` | ✅ Per-schedule | `'off_session'` | Creates new Customer each recurring booking |
| `recurring-charges cron` | Reads `recurring_schedules.stripe_customer_id` | N/A | Auto-charge off_session |

### Key Code Files
- `src/app/api/direct-booking/create-intent/route.ts` — POST, creates PI with `capture_method:'manual'`, destination charge. Auth required. No customer.
- `src/app/api/direct-booking/create-recurring/route.ts` — POST, creates Stripe Customer per recurring schedule, stores `stripe_customer_id` on `recurring_schedules`. Uses `setup_future_usage:'off_session'`.
- `src/app/api/stripe/webhook/route.ts` — `payment_intent.amount_capturable_updated` event: confirms booking, stores `stripe_payment_method_id` on `recurring_schedules` (existing per-schedule logic stays).
- `src/components/profile/PaymentStep.tsx` — `PaymentElement` inside `Elements` with `{ clientSecret }`. Stripe auto-shows saved cards when customer is attached to PI and has PMs.
- `src/components/profile/BookingCalendar.tsx` — `createPaymentIntent()` / `createRecurringIntent()` call the routes; result `clientSecret` is passed to `PaymentStep`. No changes needed for BookingCalendar's booking submission paths.
- `src/app/(parent)/layout.tsx` — Auth-guarded parent layout, queries children count for sidebar.
- `src/app/(parent)/parent/page.tsx` — Overview with 3 stat cards (Children, Upcoming, Past). Room to add a "Saved Card" stat or link.
- `src/lib/parent-nav.ts` — `parentNavItems` array drives both `ParentSidebar` and `ParentMobileNav`. Currently: Overview, My Children, My Bookings.

### DB Schema — Relevant Tables
- `recurring_schedules`: `stripe_customer_id TEXT`, `stripe_payment_method_id TEXT` (per-schedule)
- `children`: new in 0017, `parent_id UUID`
- No `parent_profiles` table exists yet.

### Stripe SDK
- `stripe@20.4.0`, `@stripe/react-stripe-js@5.6.1`, `@stripe/stripe-js@8.9.0`
- `stripe.paymentMethods.retrieve(id)` available → returns `{ card: { brand, last4, exp_month, exp_year } }`
- Destination charges + `setup_future_usage:'off_session'` confirmed working in `create-recurring` (same pattern for `create-intent`)

### Tests
- 426 passing, tsc clean
- Existing test patterns in `src/__tests__/`: vitest, vi.mock, vi.hoisted for Stripe/Supabase mocks
- `payment-intent.test.ts` covers `create-intent` route — new tests should follow same Stripe mock pattern

---

## Implementation Landscape

### T01 — DB Migration: `parent_profiles` table

**File:** `supabase/migrations/0018_parent_profiles.sql`

```sql
CREATE TABLE IF NOT EXISTS parent_profiles (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_payment_method_id TEXT,
  card_brand             TEXT,
  card_last4             TEXT,
  card_exp_month         SMALLINT,
  card_exp_year          SMALLINT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_profiles_owner_all ON parent_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Notes:**
- `PRIMARY KEY user_id` — one row per parent, upsertable
- `supabaseAdmin` (service role) does the writes from API routes and webhook (bypasses RLS)
- Parent reads their own card info via API route that does `getUser()` then queries with admin client

### T02 — Stripe Integration: create-intent + create-recurring + webhook

**`create-intent/route.ts` changes:**
1. After teacher fetch, look up `parent_profiles.stripe_customer_id` for `user.id`
2. If none: `stripe.customers.create({ email, metadata: { tutelo_user_id: user.id } })` + `supabaseAdmin.from('parent_profiles').upsert({ user_id, stripe_customer_id })`
3. Add to PI create: `customer: customerId, setup_future_usage: 'off_session'`
4. PI `metadata` already has `booking_id` — add `parent_id: user.id` for webhook lookup

**`create-recurring/route.ts` changes:**
- Currently creates a Customer unconditionally. Change to: look up `parent_profiles` first, reuse existing Customer or create new one, upsert to `parent_profiles`.
- Store same `customer.id` on `recurring_schedules.stripe_customer_id` as before (cron still reads from there — no cron change needed).

**`stripe/webhook/route.ts` changes (in `payment_intent.amount_capturable_updated`):**
- After the existing booking confirm logic, check if `pi.customer` is set
- If set: `const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string)`
- Extract `pm.card?.brand`, `pm.card?.last4`, `pm.card?.exp_month`, `pm.card?.exp_year`
- `supabaseAdmin.from('parent_profiles').upsert({ user_id: parentId, stripe_payment_method_id: pi.payment_method, card_brand, card_last4, card_exp_month, card_exp_year })` where `parentId` is from `pi.metadata.parent_id`
- Idempotent: upsert handles re-delivery

**Note on `parent_id` in PI metadata:** `create-intent` already writes `parent_id: user.id` is NOT in the current metadata — need to add it. The booking row already has `parent_id` — alternative is to look up the booking and get parent_id from DB. Either way works; metadata is simpler.

### T03 — API Routes + Dashboard Page

**New: `src/app/api/parent/payment-method/route.ts`**
- `GET`: `getUser()` → `supabaseAdmin.from('parent_profiles').select(...).eq('user_id', user.id).maybeSingle()` → return `{ card_brand, card_last4, card_exp_month, card_exp_year }` (no sensitive IDs)
- `DELETE`: `getUser()` → fetch `parent_profiles` → `stripe.paymentMethods.detach(stripe_payment_method_id)` → `supabaseAdmin` update to null out PM fields on `parent_profiles`

**New: `src/app/(parent)/parent/payment/page.tsx`**
- Server component, `getUser()` guard
- Queries `parent_profiles` via supabaseAdmin for the card details
- Shows card brand + last4 + expiry in a Card component
- "Remove card" triggers DELETE to `/api/parent/payment-method`
- "No saved card" empty state with explanation of how auto-save works

**`src/lib/parent-nav.ts` changes:**
- Add `{ href: '/parent/payment', label: 'Payment', icon: CreditCard }` to `parentNavItems`
- Both sidebar and mobile nav update automatically (they read `parentNavItems`)

**`src/app/(parent)/parent/page.tsx` (overview) — optional:**
- Add a "Saved Card" stat card (or small section) showing card_last4 if present. Low priority — the `/parent/payment` page is the primary surface.

### T04 — Tests

New test file: `src/__tests__/saved-payment-methods.test.ts`

Coverage targets (15–20 tests):
- `create-intent`: PI includes `customer` + `setup_future_usage` when parent_profiles has no customer → creates Customer + upserts to parent_profiles
- `create-intent`: PI includes `customer` from existing `parent_profiles.stripe_customer_id`
- `create-recurring`: reuses parent-level Customer from parent_profiles
- `create-recurring`: creates Customer + stores in parent_profiles when none exists
- Webhook `payment_intent.amount_capturable_updated`: when `pi.customer` is set, retrieves PM details and upserts to parent_profiles
- Webhook: idempotent — second call with same PM upserts without error
- `GET /api/parent/payment-method`: returns card details for authenticated parent
- `GET /api/parent/payment-method`: 401 for unauthenticated
- `GET /api/parent/payment-method`: null response (no saved card) for parent with no parent_profiles row
- `DELETE /api/parent/payment-method`: detaches PM + clears parent_profiles fields
- `DELETE /api/parent/payment-method`: 401 for unauthenticated
- `DELETE /api/parent/payment-method`: 404 when no saved card exists

---

## Constraints and Gotchas

1. **`parent_id` in PI metadata** — `create-intent` must add `parent_id: user.id` to PI metadata so the webhook can route the PM storage to the correct `parent_profiles` row. Without this, the webhook can't identify which parent owns the PI.

2. **Destination charges + setup_future_usage** — Confirmed working in `create-recurring`. Same pattern works in `create-intent` (destination charge = `transfer_data.destination`, PI on platform account).

3. **Stripe `payment_method` type on PI** — The `payment_intent.amount_capturable_updated` event's `pi.payment_method` is `string | Stripe.PaymentMethod | null`. The webhook code already handles this with `pi.payment_method as string`. Same pattern needed for parent_profiles upsert.

4. **`supabaseAdmin` for parent_profiles writes** — Webhook runs without user session. Must use service role client for upserts. API routes also use `supabaseAdmin` for mutations (established pattern from parent/children routes).

5. **Backward compatibility** — Existing `recurring_schedules.stripe_customer_id` is untouched. Per-schedule customers created before S03 stay as-is. `create-recurring` changes only affect NEW recurring bookings going forward.

6. **Card display** — We need to call `stripe.paymentMethods.retrieve(pmId)` in the webhook to get card details (brand/last4/exp). The PI object's `payment_method` field is just the ID string at the `amount_capturable_updated` event stage (requires expand).

7. **`supabase.upsert` syntax** — Use `{ onConflict: 'user_id' }` on the upsert since `user_id` is the primary key. Verify Supabase JS SDK upsert syntax: `supabaseAdmin.from('parent_profiles').upsert({ user_id, ... }, { onConflict: 'user_id' })`.

8. **ParentSidebar "Payment" badge** — No count badge needed (unlike Children). The nav item is plain.

---

## Recommendation

Straightforward 4-task slice. No novel architecture — all patterns established in prior slices. The riskiest part is the webhook upsert for card details (requires retrieving PM from Stripe and threading `parent_id` through PI metadata). That's T02.

**Task order:**
- T01: Migration (independent, sets up the table)
- T02: Stripe integration (create-intent + create-recurring + webhook) — core of the slice
- T03: API routes + dashboard UI (depends on T01 for schema)
- T04: Tests

---

## Skills Discovered

- `stripe-best-practices` skill is already installed (in `available_skills`) — executor agents should reference it when implementing Stripe routes.
