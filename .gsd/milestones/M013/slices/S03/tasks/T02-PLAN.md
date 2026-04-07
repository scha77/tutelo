---
estimated_steps: 30
estimated_files: 2
skills_used: []
---

# T02: Convert mark-complete stubs to real tests

Convert 6 it.todo() stubs in `tests/stripe/mark-complete.test.ts` into real passing tests for the `markSessionComplete` server action from `src/actions/bookings.ts`.

The test file already has mock scaffolding for Stripe (class-based MockStripe with paymentIntents.retrieve/capture), createClient, @/lib/email, and next/cache. What's missing: the test bodies.

**Production code behavior** (from `src/actions/bookings.ts` lines 117-186):
1. Auth: `createClient() → auth.getClaims() → claims.sub` — returns 'Not authenticated' if no claims
2. Teacher lookup: `from('teachers').select('id').eq('user_id', userId).single()` — returns 'Teacher not found' if no teacher
3. Booking lookup: `from('bookings').select('id, stripe_payment_intent').eq('id', bookingId).eq('teacher_id', teacher.id).eq('status', 'confirmed').maybeSingle()` — returns error if not found or not confirmed
4. Stripe retrieve: `stripe.paymentIntents.retrieve(pi_id)` — gets amount_capturable
5. Fee calc: `applicationFee = Math.round(amountToCapture * 0.07)` — 7% platform fee
6. Stripe capture: `stripe.paymentIntents.capture(pi_id, { amount_to_capture, application_fee_amount })` 
7. DB update: booking status → 'completed', amount_cents set
8. Review insert: supabaseAdmin inserts review stub with token
9. Email: fire-and-forget `sendSessionCompleteEmail(bookingId, reviewToken)`

**6 tests to implement:**
1. Retrieves PI and calls capture with correct amount
2. application_fee_amount is exactly 7% of amount_capturable
3. Booking status updated to 'completed'
4. sendSessionCompleteEmail called with bookingId
5. Returns error if booking not found or not confirmed
6. Returns 'Not authenticated' if no user session

**Mock setup needed:**
- `createClient` → returns supabase with `auth.getClaims` mock and `from` mock
- `from('teachers')` chain: `.select().eq().single()` → teacher
- `from('bookings')` chain: `.select().eq().eq().eq().maybeSingle()` → booking; `.update().eq()` for status update
- Stripe `paymentIntents.retrieve` → returns `{ amount_capturable: 5000, amount: 5000 }`
- Stripe `paymentIntents.capture` → resolves
- `supabaseAdmin.from('reviews').insert()` → resolves
- `sendSessionCompleteEmail` → mock already in place
- `@sentry/nextjs` → mock captureException

**Import pattern:** Use `const { markSessionComplete } = await import('@/actions/bookings')` inside each test (dynamic import after mocks are set up).

**Known pattern from KNOWLEDGE.md:** Vitest mock.calls index access needs casting through `unknown[]` to avoid TS2493.

## Inputs

- ``tests/stripe/mark-complete.test.ts` — existing stub file with mock scaffolding`
- ``src/actions/bookings.ts` — production code for markSessionComplete (lines 117-186)`

## Expected Output

- ``tests/stripe/mark-complete.test.ts` — 6 real passing tests, 0 stubs`

## Verification

npx vitest run tests/stripe/mark-complete.test.ts — expect 6 passed, 0 todo, 0 skip.
