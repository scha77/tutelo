---
id: S03
parent: M010
milestone: M010
provides:
  - parent_profiles table with Stripe Customer and saved card data — readable by S04 (messaging) or any future slice that needs parent payment state
  - Payment nav item in parentNavItems — S04 can add its own nav item without conflict
  - parent-level Stripe Customer ID pattern established — S04 can attach charges or metadata to the parent Customer without creating new ones
  - 18 unit tests covering saved PM flows — S04 test patterns can reference saved-payment-methods.test.ts for webhook mock structure
requires:
  - slice: S01
    provides: Parent auth routing to /parent, (parent) route group, parent-nav.ts pattern, parentNavItems array
affects:
  - S04 — can add Messaging nav item to parentNavItems without conflict; parent_profiles Customer available if messaging ever needs Stripe charges
  - S05 — admin dashboard may want to query parent_profiles for payment method adoption metrics
key_files:
  - supabase/migrations/0018_parent_profiles.sql
  - src/app/api/direct-booking/create-intent/route.ts
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/parent/payment-method/route.ts
  - src/app/(parent)/parent/payment/page.tsx
  - src/lib/parent-nav.ts
  - src/__tests__/saved-payment-methods.test.ts
key_decisions:
  - parent_profiles uses user_id as PK (1:1 with auth.users) — upsert with onConflict: 'user_id'
  - Customer resolution failure in create-intent returns 502 with booking cleanup (consistent with existing PI failure pattern)
  - PM upsert in webhook is non-critical — wrapped in try/catch so booking confirmation still succeeds even if Stripe PM retrieve or DB upsert fails
  - Stripe is lazy-imported only in DELETE handler — GET /api/parent/payment-method doesn't need Stripe SDK at all
  - Payment page is fully client-side (fetches from API route) — matches children page pattern; no server component needed
  - brandDisplayName utility maps Stripe card brand strings (visa, mastercard, amex, etc.) to user-friendly display names
patterns_established:
  - parent_profiles as central hub for parent-level Stripe data — future slices that need parent payment state should read from here, not from recurring_schedules or booking-level metadata
  - Non-critical webhook side-effect pattern: try/catch around any post-confirmation enrichment (PM upsert, analytics, etc.) so booking success is never blocked
  - Lazy Stripe import pattern: only import Stripe in the handler that needs it (DELETE), not at module level — keeps GET routes lightweight
  - vi.mock'd Stripe + any-typed mock objects pattern for webhook tests (see KNOWLEDGE.md for TS2702 avoidance)
observability_surfaces:
  - console.log on successful parent_profiles Customer creation in create-intent and create-recurring
  - console.log on successful PM upsert in webhook: '[stripe/webhook] Upserted parent_profiles PM for parent {userId} ({brand} ****{last4})'
  - console.error on paymentMethods.retrieve or parent_profiles upsert failure in webhook (includes PI ID and parent_id)
  - GET /api/parent/payment-method returns {card: null} as a clean signal that no card is saved yet (distinguishable from 401/500)
drill_down_paths:
  - .gsd/milestones/M010/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M010/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M010/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:53:52.600Z
blocker_discovered: false
---

# S03: Saved Payment Methods

**Parent books a session, card is auto-saved to their Stripe Customer; subsequent bookings reuse the saved card; parent can view and remove their saved card from /parent/payment.**

## What Happened

S03 delivered the full saved payment method loop across three tasks with no blockers, no regressions, and all 18 new tests passing.

**T01 — Backend integration (migration + booking routes + webhook):** Created migration 0018 adding the `parent_profiles` table (`user_id PK`, `stripe_customer_id`, `stripe_payment_method_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`, `updated_at`, RLS owner-all policy). Modified `create-intent` to resolve or create a parent-level Stripe Customer before PI creation, attaching `customer`, `setup_future_usage: 'off_session'`, and `parent_id` to the PI. Customer resolution failure returns 502 with booking cleanup (same pattern as existing PI failure path). Modified `create-recurring` to check `parent_profiles` first and reuse the existing Customer via `stripe.customers.retrieve()` rather than creating a new one — the per-schedule `stripe_customer_id` on `recurring_schedules` is preserved for backward compat with the cron auto-charge path. Added PM upsert logic to the webhook's `payment_intent.amount_capturable_updated` handler: when `parent_id`, `customer`, and `payment_method` are all present in the PI, calls `stripe.paymentMethods.retrieve()` to get card details and upserts to `parent_profiles`. The upsert is wrapped in try/catch — PM storage failure logs an error but never blocks the booking confirmation response. Pre-S03 bookings (no `parent_id` in metadata) are handled gracefully by skipping the upsert entirely. Updated 5 existing test files to add `parent_profiles` mock handling, preserving all 426 pre-existing tests.

**T02 — Parent-facing UI (API routes + dashboard page + nav):** Created `GET /api/parent/payment-method` returning safe display fields (`card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`) or `{ card: null }`. Created `DELETE /api/parent/payment-method` that detaches the PM from Stripe via `stripe.paymentMethods.detach()` and nulls out card fields on `parent_profiles`. Stripe is lazy-imported only in the DELETE handler to keep GET lightweight. Created `/parent/payment` as a fully client-side page (matching the children page pattern) with card display (brand name mapping, masked PAN, expiry), a remove confirmation dialog, empty state with find-a-tutor link, and error handling. Updated `parent-nav.ts` to add a Payment nav item with `CreditCard` icon after My Bookings — visible in both sidebar and mobile nav.

**T03 — Test coverage (18 tests across 5 groups):** Created `saved-payment-methods.test.ts` using established `vi.hoisted` + `vi.mock` patterns. Groups: create-intent Customer attachment (5 tests: new Customer creation, `setup_future_usage`/`customer` on PI, Customer reuse, `parent_id` metadata, backward-compat params), create-recurring Customer reuse (3 tests: existing Customer reuse via retrieve, new Customer creation, `recurring_schedules` backward compat), webhook PM upsert (4 tests: retrieve + upsert, skip when no `parent_id`, skip when no `payment_method`, idempotent re-delivery), GET payment-method (3 tests: card details, null card, 401), DELETE payment-method (3 tests: detach + clear, 404, 401). One deviation: mock PI objects in webhook tests typed as `any` instead of `Stripe.PaymentIntent` to avoid TS2702 with vi.mock'd stripe module. Non-fatal stderr warnings from create-recurring tests about `sendRecurringBookingConfirmationEmail` (route wraps email in try/catch — all 18 tests still pass). Full suite grew from 426 → 444 tests, 0 failures.

## Verification

All slice verification checks pass:
- `npx tsc --noEmit` → exit 0
- `test -f supabase/migrations/0018_parent_profiles.sql` → PASS
- `grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts` → PASS
- `grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts` → PASS
- `grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts` → PASS
- `grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts` → PASS
- `grep -q 'parent_profiles' src/app/api/stripe/webhook/route.ts` → PASS
- `test -f src/app/api/parent/payment-method/route.ts` → PASS
- `test -f src/app/(parent)/parent/payment/page.tsx` → PASS
- `grep -q 'CreditCard' src/lib/parent-nav.ts` → PASS
- `grep -q 'payment' src/lib/parent-nav.ts` → PASS
- `grep -c 'it(' src/__tests__/saved-payment-methods.test.ts` → 18 (≥15) PASS
- `npx vitest run src/__tests__/saved-payment-methods.test.ts` → 18/18 pass
- `npx vitest run` → 444/444 pass, 0 failures, 45 todo (up from 426)

## Requirements Advanced

- PARENT-05 — Delivered: parent_profiles table, auto-save on booking, /parent/payment UI, remove action, full test coverage
- PARENT-09 — Delivered: parent-level Stripe Customer (not per-teacher or per-schedule), reuse in both booking routes, stored in parent_profiles for future use

## Requirements Validated

- PARENT-05 — 18 unit tests pass covering Customer creation, PM upsert in webhook, GET/DELETE routes. Full suite 444 passing.
- PARENT-09 — create-intent and create-recurring both check parent_profiles first and reuse existing Customer — confirmed by Customer-reuse unit tests (no stripe.customers.create call when profile exists).

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T03: Mock PaymentIntent objects in webhook tests typed as `any` instead of `Stripe.PaymentIntent` to avoid TS2702 error when the stripe module is replaced by vi.mock. Non-fatal stderr warnings appear in create-recurring tests for `sendRecurringBookingConfirmationEmail` (route wraps email in try/catch — all tests pass regardless).

## Known Limitations

Single saved card per parent (by design — D023). The /parent/payment page does not offer a "replace card" flow; parent removes the current card, then the next booking auto-saves the new card. No Stripe PM display for recurring-schedule-level Customers (pre-S03 recurring bookings still have their own per-schedule Customers that are not surfaced on the payment page).

## Follow-ups

If multi-card support is needed (D023 revisable), parent_profiles would need to become a parent_payment_methods join table with a default flag. The current single-row upsert design assumes one saved card — extending it would require schema change. The non-fatal email warning in create-recurring tests (sendRecurringBookingConfirmationEmail not exported from email mock) could be cleaned up in a future test hygiene pass.

## Files Created/Modified

- `supabase/migrations/0018_parent_profiles.sql` — New migration: parent_profiles table with user_id PK, Stripe Customer/PM fields, card display fields, RLS owner-all policy
- `src/app/api/direct-booking/create-intent/route.ts` — Added parent_profiles Customer resolve-or-create logic, customer + setup_future_usage + parent_id on PI
- `src/app/api/direct-booking/create-recurring/route.ts` — Added parent_profiles Customer reuse check before creating new Stripe Customer; upserts to parent_profiles; preserves recurring_schedules.stripe_customer_id for cron compat
- `src/app/api/stripe/webhook/route.ts` — Added PM card detail retrieval and parent_profiles upsert in payment_intent.amount_capturable_updated handler (non-critical, try/catch wrapped)
- `src/app/api/parent/payment-method/route.ts` — New GET/DELETE API routes for saved card display and removal
- `src/app/(parent)/parent/payment/page.tsx` — New parent dashboard payment page: card display with brand/last4/expiry, remove confirmation dialog, empty state
- `src/lib/parent-nav.ts` — Added Payment nav item with CreditCard icon after My Bookings
- `src/__tests__/saved-payment-methods.test.ts` — New: 18 unit tests across 5 groups covering all S03 code paths
- `src/__tests__/payment-intent.test.ts` — Updated: added parent_profiles mock handling for S03 create-intent changes
- `src/__tests__/booking-routing.test.ts` — Updated: added parent_profiles mock handling
- `src/__tests__/parent-phone-storage.test.ts` — Updated: added parent_profiles mock handling
- `src/__tests__/create-recurring.test.ts` — Updated: added parent_profiles mock handling for create-recurring Customer reuse
- `tests/unit/session-type-pricing.test.ts` — Updated: added parent_profiles mock handling
