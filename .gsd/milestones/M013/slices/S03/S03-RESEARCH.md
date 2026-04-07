# S03 Research: Test Stub Audit & Cleanup

## Summary

The `tests/` directory contains **45 `it.todo()` stubs** across 12 files and **4 `it.skip()` tests** in 1 file. These are wave-0 leftovers from M001 planning — placeholder stubs that were never converted. The real test suite lives in `src/__tests__/` (27 files, 470 passing tests). Most stubs describe behavior that is already tested in `src/__tests__/`, making them safe to delete. A minority describe genuinely uncovered features — those are the convert candidates.

## Recommendation

**Approach: Delete-first, convert-selectively.** For each file, cross-reference what the stubs describe against existing `src/__tests__/` coverage. Delete stubs where coverage exists (the majority). For the ~6 stubs that describe genuinely uncovered behavior in critical paths, convert them to real tests with proper mocks. For 4 `it.skip` tests in og-metadata, fix the mock chain and unskip.

## Implementation Landscape

### Inventory: 45 Todos + 4 Skips Across 13 Files

Files with **only stubs (no passing tests)** — pure deletion candidates if covered elsewhere:
| File | Stubs | Topic | Covered by `src/__tests__/`? |
|------|-------|-------|------------------------------|
| `tests/auth/session.test.ts` | 2 todo | Cookie persistence, expired redirect | E2E behavior — not unit-testable. Delete. |
| `tests/onboarding/wizard.test.ts` | 4 todo | Step validation, resume, slug editing, publish redirect | No existing coverage. Component test would require heavy mocking of OnboardingWizard (client component with multi-step state). Low ROI. Delete. |
| `tests/bookings/booking-calendar.test.tsx` | 5 todo | Subject dropdown, success/error states, reset | `booking-child-selector.test.ts` covers child selector; no subject dropdown test, but BookingCalendar was decomposed in M011. Delete — component internals changed substantially. |
| `tests/stripe/email-confirmation.test.ts` | 3 todo | sendBookingConfirmationEmail recipients/template | `webhook-capture.test.ts` tests the webhook calling `sendBookingConfirmationEmail`. The email function itself is a thin Resend wrapper. Delete. |
| `tests/stripe/email-complete.test.ts` | 3 todo | sendSessionCompleteEmail recipients/template/review link | No existing coverage of the email function internals. Low ROI — function is a Resend wrapper querying booking data. Delete. |
| `tests/stripe/email-cancellation.test.ts` | 2 todo | sendCancellationEmail recipients/template | `cancel-session.test.ts` tests the action calling it. Delete. |
| `tests/stripe/connect-stripe.test.ts` | 4 todo | Stripe account creation, existing account, already-enabled, unauth | No existing coverage. The `connectStripe` server action uses `redirect()` which throws `NEXT_REDIRECT` — tricky to test. Delete — function is straightforward with no branching bugs. |
| `tests/stripe/mark-complete.test.ts` | 6 todo | PI capture, 7% fee, status update, email, error, auth | No existing direct coverage of `markSessionComplete`. This is the highest-value convert candidate — it covers PI capture + fee calculation + status update. **Convert.** |
| `tests/stripe/auto-cancel.test.ts` | 5 todo | 401 auth, cancel logic, teacher-connected guard, idempotency, email ordering | No existing coverage. Cron route is critical for revenue protection. **Convert.** |
| `tests/stripe/reminders-cron.test.ts` | 5 todo | 401 auth, 24hr/48hr email split, <24hr skip, already-connected skip | `src/__tests__/reminders.test.ts` covers **session-reminders** (a different cron). Stripe-reminders cron has NO coverage. **Convert.** |

Files with **mixed passing + stubs**:
| File | Passing | Stubs | Action |
|------|---------|-------|--------|
| `tests/bookings/booking-action.test.ts` | 5 | 3 todo | Delete 3 stubs. `submitBookingRequest` stubs are for the booking creation action which changed substantially (now goes through direct-booking API route). The 5 passing tests for `acceptBooking`/`declineBooking` are unique coverage — **keep passing tests, delete stubs.** |
| `tests/stripe/checkout-session.test.ts` | 4 passing | 3 todo | Delete 3 stubs. The 4 passing tests cover `account.updated` webhook handler and `checkout.session.completed` handler. `src/__tests__/webhook-capture.test.ts` covers `payment_intent.amount_capturable_updated`. Together they cover all webhook handlers. **Keep passing tests, delete stubs.** |

Files with **only skips (have implementations)**:
| File | Skips | Action |
|------|-------|--------|
| `tests/unit/og-metadata.test.ts` | 4 skip | Tests have full implementations but were disabled. Mock uses `createClient` but production code uses `supabaseAdmin` from service.ts. Fix mock chain to match `getTeacherBySlug` using `supabaseAdmin`, unskip all 4. **Fix and unskip.** |

### Convert Candidates (3 files, ~16 stubs → real tests)

**1. `tests/stripe/mark-complete.test.ts` (6 stubs)**
- Tests `markSessionComplete` from `src/actions/bookings.ts`
- Needs: mock `createClient` (auth chain), mock `stripe` (PI retrieve + capture), mock `supabaseAdmin` (review insert), mock `@/lib/email` (sendSessionCompleteEmail), mock `next/cache`
- Mocks already scaffolded in the file — just needs test bodies
- Key assertions: PI capture called with correct amount, 7% fee, booking status → completed, email called, error cases

**2. `tests/stripe/auto-cancel.test.ts` (5 stubs)**
- Tests `GET /api/cron/auto-cancel` route handler
- Needs: mock `supabaseAdmin` (booking query + teacher check + booking update), mock `sendCancellationEmail`, mock `@sentry/nextjs`
- Mocks already scaffolded — needs test bodies
- Key assertions: 401 on bad auth, cancels only non-Stripe-connected teacher bookings, idempotent, email after update

**3. `tests/stripe/reminders-cron.test.ts` (5 stubs)**
- Tests `GET /api/cron/stripe-reminders` route handler
- Needs: mock `supabaseAdmin` (booking query with teacher join), mock `sendFollowUpEmail` + `sendUrgentFollowUpEmail`, mock `@sentry/nextjs`
- Mocks already scaffolded — needs test bodies
- Key assertions: 401, 24-48hr → followUp, 48hr+ → urgent, <24hr → no email, teacher already connected → skip

### og-metadata Fix (1 file, 4 skips → passing)

`tests/unit/og-metadata.test.ts` mocks `@/lib/supabase/server` (createClient) but production `getTeacherBySlug` uses `supabaseAdmin` from `@/lib/supabase/service`. The mock for service is present but uses a separate chain (`mockAdminFrom/mockAdminSelect/mockAdminEq/mockAdminSingle`). The test body reads from `mockAdminSingle` — that's correct. The issue is likely that `generateMetadata` calls `getTeacherBySlug` which uses `supabaseAdmin.from().select().eq().single()` — the mock chain returns from `mockAdminSingle` but the `.select()` call shape is `.select('*, availability(*)')` which the mock should handle fine. The skip was added because the test was crashing, not because the assertions were wrong.

The real issue: `generateMetadata` is exported from `src/app/[slug]/page.tsx` which imports many client components (BookingCalendar, HeroSection, etc.) at module level. The test `await import('@/app/[slug]/page')` pulls in the entire page module including all component imports. This is heavy and may fail due to missing transitive mocks (e.g., motion, react-qr-code, date-fns). The test should isolate `generateMetadata` better or accept the transitive import cost and add any missing mocks.

### Natural Task Decomposition

1. **T01: Delete all pure-stub files and remove stubs from mixed files** — removes 30+ stubs, straightforward bulk delete. Verify test count drops but passing count stays same (470).

2. **T02: Convert mark-complete stubs to real tests** — 6 real tests, highest-value coverage gap. Mocks already scaffolded.

3. **T03: Convert auto-cancel and reminders-cron stubs to real tests** — 10 real tests across 2 cron routes. Similar mock pattern (supabaseAdmin + email).

4. **T04: Fix og-metadata skips** — 4 tests unskipped. Requires fixing the mock chain and handling transitive imports from the page module.

5. **T05: Final verification** — `npx vitest run` shows 0 todo, 0 skip, all green.

### What to Build First

T01 (deletions) should go first — it clears noise and makes the test report clean for verifying subsequent conversions. T02–T03 can proceed in parallel. T04 is independent but may need some debugging for transitive import mocks. T05 is the final gate.

### Verification

- After T01: `npx vitest run 2>&1 | grep 'todo'` → should show 0 todo stubs remaining (except the convert candidates in T02/T03)
- After T02–T04: `npx vitest run` → 0 todo, 0 skip
- Final: `npx vitest run` → all pass, 0 todo, 0 skip, test count ≥ 470 + new tests

### Risk: og-metadata transitive imports

The `[slug]/page.tsx` module pulls in BookingCalendar, AnimatedProfile, and many other client components. Some of these import motion, react-qr-code, @stripe/stripe-js, etc. Getting all transitive mocks right could be time-consuming. If T04 takes too long, consider: (a) extracting `generateMetadata` into a separate file, or (b) deleting the 4 skip tests and noting the coverage gap as acceptable — the metadata function is well-understood and unlikely to break silently.

## Skills Discovered

No new skills needed — this is pure Vitest test work using established patterns already in the codebase.
