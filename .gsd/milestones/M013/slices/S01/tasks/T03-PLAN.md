---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T03: Fix parent-phone-storage and recurring-charges tests

(1) In `parent-phone-storage.test.ts`, add `.from()` to the mock supabase returned by `setupDeferredMocks` — it needs to handle `.from('teachers').select('slug').eq('id', teacherId).single()`. Also fix the 2 'skips phone UPDATE' tests that incorrectly assert `supabaseAdmin.from` was not called — the slug revalidation uses the SSR `supabase` client, not `supabaseAdmin`. (2) In `recurring-charges.test.ts`, fix the `idempotencyKey` assertion to exact match `'recurring-charge-booking-recurring-1'` and use plain object match instead of `expect.objectContaining`.

## Inputs

- `src/actions/bookings.ts`

## Expected Output

- `src/__tests__/parent-phone-storage.test.ts (fixed mocks)`
- `src/__tests__/recurring-charges.test.ts (fixed assertion)`

## Verification

npx vitest run src/__tests__/parent-phone-storage.test.ts src/__tests__/recurring-charges.test.ts — 0 failures
