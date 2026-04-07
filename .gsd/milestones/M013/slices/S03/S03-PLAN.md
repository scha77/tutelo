# S03: Test Stub Audit & Cleanup

**Goal:** Resolve all 45 it.todo() stubs and 4 it.skip() tests — delete stubs covered elsewhere, convert high-value stubs to real passing tests, fix skipped tests.
**Demo:** After this: npx vitest run shows 0 todo stubs. Every test either passes or was deliberately removed with justification.

## Tasks
- [x] **T01: Deleted 7 pure-stub test files and removed 6 stubs from 2 mixed files, reducing todo count from 22 to 16 with zero test regressions** — Bulk cleanup of 29 it.todo() stubs that describe behavior already covered by existing tests in src/__tests__/ or that describe obsolete/low-value behavior.

**Delete these 7 files entirely** (all stubs, no passing tests):
1. `tests/auth/session.test.ts` (2 todo) — E2E behavior, not unit-testable
2. `tests/onboarding/wizard.test.ts` (4 todo) — component changed substantially, heavy mocking for low ROI
3. `tests/bookings/booking-calendar.test.tsx` (5 todo) — BookingCalendar decomposed in M011, stubs describe old API
4. `tests/stripe/email-confirmation.test.ts` (3 todo) — webhook-capture.test.ts covers the email call path
5. `tests/stripe/email-complete.test.ts` (3 todo) — thin Resend wrapper, low ROI
6. `tests/stripe/email-cancellation.test.ts` (2 todo) — cancel-session.test.ts covers the email call path
7. `tests/stripe/connect-stripe.test.ts` (4 todo) — straightforward server action with no branching bugs

**Remove stubs from these 2 mixed files** (keep passing tests, delete only todo stubs):
1. `tests/bookings/booking-action.test.ts` — remove 3 todo stubs for `submitBookingRequest` (now uses direct-booking API route), keep 5 passing tests for acceptBooking/declineBooking
2. `tests/stripe/checkout-session.test.ts` — remove 3 todo stubs, keep 4 passing tests

Total: 29 stubs removed.
  - Estimate: 20m
  - Files: tests/auth/session.test.ts, tests/onboarding/wizard.test.ts, tests/bookings/booking-calendar.test.tsx, tests/bookings/booking-action.test.ts, tests/stripe/email-confirmation.test.ts, tests/stripe/email-complete.test.ts, tests/stripe/email-cancellation.test.ts, tests/stripe/connect-stripe.test.ts, tests/stripe/checkout-session.test.ts
  - Verify: npx vitest run 2>&1 | tail -5 — expect 470 passed, 16 todo, 4 skipped, 0 failures. Total test files should be 52 (59 - 7 deleted).
- [x] **T02: Converted all 6 it.todo() stubs in mark-complete.test.ts to real passing tests for markSessionComplete server action** — Convert 6 it.todo() stubs in `tests/stripe/mark-complete.test.ts` into real passing tests for the `markSessionComplete` server action from `src/actions/bookings.ts`.

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
  - Estimate: 1h30m
  - Files: tests/stripe/mark-complete.test.ts, src/actions/bookings.ts
  - Verify: npx vitest run tests/stripe/mark-complete.test.ts — expect 6 passed, 0 todo, 0 skip.
- [x] **T03: Converted all 10 it.todo() stubs across auto-cancel.test.ts and reminders-cron.test.ts into real passing tests** — Convert 10 it.todo() stubs across 2 cron route test files into real passing tests.

### auto-cancel (5 tests) — `tests/stripe/auto-cancel.test.ts`

**Production code** (`src/app/api/cron/auto-cancel/route.ts`):
- Auth: checks `Authorization: Bearer {CRON_SECRET}` header → 401 if missing/wrong
- Queries bookings: `supabaseAdmin.from('bookings').select('id, parent_email, teacher_id').eq('status', 'requested').lt('created_at', cutoff48hr)`
- Per booking: checks teacher's `stripe_charges_enabled` via `supabaseAdmin.from('teachers').select(...).eq('id', teacher_id).maybeSingle()`
- If teacher NOT connected: updates booking status to 'cancelled' with `.eq('status', 'requested')` idempotency guard
- Sends `sendCancellationEmail(booking.id)` only if update returned rows
- Returns JSON `{ cancelled, total_checked }`

**5 tests:**
1. Returns 401 when Authorization header missing or wrong
2. Cancels requested bookings >48hr old where teacher stripe_charges_enabled=false
3. Does NOT cancel when teacher has stripe_charges_enabled=true
4. Is idempotent — second run cancels 0 rows
5. Sends cancellation email AFTER status update, not before

### stripe-reminders (5 tests) — `tests/stripe/reminders-cron.test.ts`

**Production code** (`src/app/api/cron/stripe-reminders/route.ts`):
- Auth: same CRON_SECRET header check → 401
- Queries: `supabaseAdmin.from('bookings').select('..., teachers(...)').eq('status', 'requested').lt('created_at', hr24)`
- Per booking: skips if `teacher.stripe_charges_enabled=true` or no `social_email`
- If booking 48hr+ old: calls `sendUrgentFollowUpEmail(teacher.social_email, ...)`
- If booking 24-48hr old: calls `sendFollowUpEmail(teacher.social_email, ...)`
- Returns JSON `{ sent_24hr, sent_48hr }`

**5 tests:**
1. Returns 401 when Authorization header missing or wrong
2. Sends 24hr gentle reminder for 24-48hr old booking
3. Sends 48hr urgent email for >48hr old booking
4. Sends no email for <24hr old booking (filtered by .lt query)
5. Sends no reminder when teacher has stripe_charges_enabled=true

**Both files share the same mock pattern:**
- `supabaseAdmin` from `@/lib/supabase/service` — mock `from()` chains
- Email functions from `@/lib/email` — already mocked in scaffold
- `@sentry/nextjs` — already mocked in scaffold
- `process.env.CRON_SECRET` — set in test

**Import pattern for route handlers:** `const { GET } = await import('@/app/api/cron/auto-cancel/route')`
**Request construction:** `new NextRequest('http://localhost/api/cron/auto-cancel', { headers: { authorization: 'Bearer test-secret' } })`
  - Estimate: 1h30m
  - Files: tests/stripe/auto-cancel.test.ts, tests/stripe/reminders-cron.test.ts, src/app/api/cron/auto-cancel/route.ts, src/app/api/cron/stripe-reminders/route.ts
  - Verify: npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts — expect 10 passed, 0 todo, 0 skip.
- [ ] **T04: Fix og-metadata mock chain, unskip tests, and run final verification** — Fix 4 it.skip() tests in `tests/unit/og-metadata.test.ts` and verify the full suite is clean.

**Root cause:** The mock for `supabaseAdmin.from().select().eq().single()` returns raw teacher data instead of the `{ data, error }` object that Supabase's `.single()` actually returns. Production code does `const { data } = await single()` — so with the current mock, `data` is `undefined` and the metadata function returns the fallback for every test.

**Fix:**
1. Change `mockAdminSingle.mockResolvedValue({ full_name: '...', ... })` → `mockAdminSingle.mockResolvedValue({ data: { full_name: '...', ... }, error: null })`
2. Change `mockAdminSingle.mockResolvedValue(null)` (null teacher test) → `mockAdminSingle.mockResolvedValue({ data: null, error: null })`
3. Change all 4 `it.skip(` → `it(`

**4 tests to unskip:**
1. Returns personalized title and description for a valid teacher slug
2. Returns generic Tutelo fallback for an invalid slug
3. Handles teacher with no subjects gracefully
4. Handles teacher with null subjects array

**Verification assertions already written** — they test metadata.title, metadata.description, metadata.openGraph.url, etc. The assertions should pass once the mock returns the correct shape.

**Potential issue:** React's `cache()` wrapper on `getTeacherBySlug` — in test context without RSC render, `cache` is effectively a pass-through. Each test uses a unique slug, so no caching conflicts.

**Final verification:** Run `npx vitest run` on the full suite. Expected: all files pass, 0 todo, 0 skip, ~490 total tests.
  - Estimate: 30m
  - Files: tests/unit/og-metadata.test.ts
  - Verify: npx vitest run — expect 0 todo, 0 skip, 0 failures, all files pass. Test count ≥ 490.
