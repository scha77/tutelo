---
estimated_steps: 34
estimated_files: 3
skills_used: []
---

# T02: Build payment-method API routes and /parent/payment dashboard page

## Description

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

## Inputs

- ``src/lib/parent-nav.ts` — existing parent nav items array (Overview, My Children, My Bookings)`
- ``src/app/(parent)/layout.tsx` — auth-guarded parent layout (establishes auth pattern)`
- ``src/app/(parent)/parent/children/page.tsx` — reference for parent dashboard page patterns`
- ``src/app/api/parent/children/route.ts` — reference for parent API route patterns (getUser + supabaseAdmin)`
- ``supabase/migrations/0018_parent_profiles.sql` — schema for parent_profiles table (from T01)`

## Expected Output

- ``src/app/api/parent/payment-method/route.ts` — new GET/DELETE API route for saved payment method`
- ``src/app/(parent)/parent/payment/page.tsx` — new payment dashboard page with card display and remove action`
- ``src/lib/parent-nav.ts` — modified to include Payment nav item with CreditCard icon`

## Verification

npx tsc --noEmit && test -f src/app/api/parent/payment-method/route.ts && test -f src/app/(parent)/parent/payment/page.tsx && grep -q 'CreditCard' src/lib/parent-nav.ts && npx vitest run
