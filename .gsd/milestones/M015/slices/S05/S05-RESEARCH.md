# S05 Research: End-to-End Booking Flow Test

## Summary

This slice introduces Playwright E2E testing to Tutelo — no Playwright infrastructure exists yet. The test described in the roadmap covers the complete booking lifecycle: parent signup → teacher profile → calendar slot selection → Stripe test card payment → booking confirmation email → cancellation → cancellation email. This is a **deep research** slice due to: (1) no existing Playwright setup, (2) Stripe Elements iframe interaction complexity, (3) email verification strategy decisions, (4) data seeding against a live Supabase instance, and (5) async webhook-driven booking confirmation.

## Recommendation

**Approach: API-layer E2E with browser for critical UI paths, Resend API for email verification.**

Split into three work phases:
1. **Playwright infrastructure** — install `@playwright/test`, create config, global setup/teardown for test data seeding
2. **Core booking E2E** — browser test covering profile → calendar → form → auth → Stripe → confirmation
3. **Email verification & cancellation** — use Resend's `emails.get(id)` API to verify emails arrived, cancel from teacher dashboard

Use `delivered@resend.dev` as the test email recipient (Resend's built-in testing address). Emails sent to this address go through the full API flow and are retrievable via the Resend API, but don't impact deliverability reputation.

## Implementation Landscape

### What Exists (✅)
- **Vitest** unit/integration tests (514 tests, 55 files) — parallel infrastructure
- **Supabase CLI** v2.84.2 installed — can be used for local DB or seeding against remote
- **Stripe test mode** — keys in `.env.local` (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- **Resend API key** — in `.env.local`
- **Full booking flow** — BookingCalendar (643 lines) with calendar→form→auth→payment→success step machine
- **InlineAuthForm** — email/password signup within booking flow (client-side Supabase auth)
- **PaymentStep** — Stripe Elements with `@stripe/react-stripe-js`, uses `confirmPayment` with `redirect: 'if_required'`
- **Teacher profile** at `/[slug]` — ISR page fetching from supabaseAdmin
- **Cancellation** — teacher dashboard `cancelSession` server action, `ConfirmedSessionCard` has cancel button with `window.confirm`

### What Doesn't Exist (❌)
- **Playwright** — not installed, no config, no test dir, no scripts
- **Test data seeding** — no seed.sql, no test fixtures, no global setup
- **E2E test user accounts** — no test parent or test teacher in Supabase
- **`test:e2e` script** in package.json

### Key Dependencies
- `@playwright/test` — test runner + browser automation
- `stripe` (already in deps) — for programmatic PI creation/cancellation in setup
- `resend` (already in deps) — for email verification via `emails.get()`
- `@supabase/supabase-js` (already in deps) — for test data seeding via service role

## Architecture & Flow Analysis

### Booking Flow Steps (Browser)
1. Navigate to `/{teacher-slug}` — profile page renders calendar
2. Click an available date → time slots appear
3. Click a time slot → form step (name, subject, notes)
4. Submit form → if `stripeConnected`, auth step appears
5. Sign up/sign in via InlineAuthForm (email/password, client-side Supabase)
6. On auth success → `createPaymentIntent()` POST to `/api/direct-booking/create-intent`
7. PaymentIntent created → Stripe Elements renders with `clientSecret`
8. Fill card (4242 4242 4242 4242) → `stripe.confirmPayment()` 
9. PI status becomes `requires_capture` → `onSuccess()` → step = 'success'
10. **Async**: Stripe fires `payment_intent.amount_capturable_updated` webhook → updates booking to `confirmed` → sends confirmation email

### Critical Interaction: Stripe Elements iframes
PaymentStep renders `<Elements>` → `<PaymentElement>` which creates Stripe's iframe. Playwright must use `page.frameLocator()` to interact with card fields inside the Stripe iframe. The iframe selector is typically `iframe[title="Secure payment input frame"]` or similar Stripe-generated selector.

Stripe test card `4242 4242 4242 4242` with any future expiry and any CVC works in test mode.

### Webhook Timing Challenge
After the browser confirms payment, the booking doesn't become `confirmed` until the Stripe webhook fires (`payment_intent.amount_capturable_updated`). In a local test environment, two options:
1. **Stripe CLI** (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) — forwards live test events to local server
2. **Direct DB update** — after PI confirmation in browser, seed the booking status to `confirmed` via supabaseAdmin
3. **Poll DB** — after payment, poll bookings table until status = 'confirmed'

**Recommendation**: Use Stripe CLI for webhook forwarding. This tests the real webhook path. The test should poll for booking confirmation (with timeout) after the payment step succeeds.

### Email Verification Strategy

Three viable approaches:

| Approach | Pros | Cons |
|----------|------|------|
| **Resend `delivered@resend.dev`** + `emails.get(id)` | Real API flow, no extra service, built-in Resend feature | Need email ID from send call (not returned by current fire-and-forget pattern) |
| **Resend API `emails.list`** with filter | Can list recent emails without knowing ID | Rate limits; no per-recipient filter; relies on timing |
| **Route-level intercept** — mock Resend in test env | No network dependency, fast, deterministic | Doesn't test real email delivery; requires env-var-gated mock |

**Recommendation**: Use a route-level intercept via an E2E-specific API endpoint. Add a `POST /api/test/email-log` endpoint (protected by `E2E_TEST_SECRET` env var) that captures email send calls when `NODE_ENV=test` or a test flag is set. The test queries this endpoint to verify emails were dispatched with correct subjects/recipients. This avoids:
- Adding return-value plumbing to every fire-and-forget email call
- Depending on Resend API timing for email listing
- Needing Stripe CLI for webhook forwarding (which adds infra complexity)

**Simpler alternative**: Since we already use Resend's `emails.send()` and get back `{ data: { id } }`, the test can use `resend.emails.get(id)` to verify delivery. But this requires the email functions to return the email ID, which they currently don't.

**Pragmatic middle ground**: For MVP E2E, verify emails were sent by checking the Resend dashboard API (`GET /emails`) filtered by time window. The `resend.emails.list()` SDK method returns recent emails. After each action, poll for an email with the expected subject sent within the last 60 seconds. This tests the real email path without code changes.

### Data Seeding Requirements

The test needs a teacher with:
- `is_published: true`
- `stripe_charges_enabled: true` with valid `stripe_account_id`
- At least one `availability` slot on a day that falls within the next week
- `hourly_rate` set (for payment amount calculation)
- A known `slug` for navigation

And needs to clean up:
- Test booking rows
- Test parent auth user (Supabase auth)
- Any Stripe PaymentIntents created during the test

**Seeding approach**: Use `supabaseAdmin` in a Playwright `globalSetup` script to:
1. Create (or upsert) a test teacher in the `teachers` table
2. Create availability slots for the test teacher
3. In `globalTeardown`, clean up test bookings and optionally the test user

The test teacher needs a real Stripe Connect account ID. Options:
- Use an existing test account from Stripe dashboard
- Create one programmatically via Stripe API in setup
- Hard-code a known test account ID from the project's Stripe test environment

### Cancellation Flow (Teacher Side)
The ConfirmedSessionCard has a "Cancel Session" button that calls `cancelSession(bookingId)` server action. This:
1. Checks auth (getClaims — which is problematic per KNOWLEDGE.md, but works from the teacher dashboard when not triggered by POST re-render)
2. Updates booking status to 'cancelled'
3. Cancels the Stripe PaymentIntent
4. Sends cancellation email to parent
5. Sends cancellation SMS if opted in

For E2E: after booking, navigate to teacher dashboard → sessions page → find the booking → click cancel → confirm dialog → verify status change.

**Complexity**: The teacher dashboard requires teacher auth. The test would need to:
1. Sign in as the test teacher (separate auth flow)
2. Navigate to `/dashboard/sessions`
3. Find the booking card
4. Click "Cancel Session"
5. Accept `window.confirm` dialog
6. Verify the cancellation email

This doubles the auth surface area. **Alternative**: Cancel via direct DB update (supabaseAdmin) + trigger cancellation email via API, or use the parent's manage link (if it exists for single bookings — currently only `/manage/[token]` exists for recurring series).

**Pragmatic recommendation**: Cancel from the teacher dashboard to test the real UI flow. Use `page.on('dialog')` to auto-accept the `window.confirm`. The teacher auth can reuse the InlineAuthForm pattern (the login page at `/login`).

## Pitfalls & Constraints

### 1. Stripe Elements iframe timing
Stripe Elements iframes load asynchronously. Tests must wait for the iframe to be ready before filling card details. The payment input is inside a nested iframe structure. Use `page.frameLocator('iframe[title*="payment"]')` with retries.

### 2. Webhook dependency for booking confirmation
Without Stripe CLI forwarding webhooks, the booking stays in `requested` status after payment. The success step renders in the browser (PI status is `requires_capture`), but the DB booking isn't `confirmed`. Options:
- **Run Stripe CLI** during tests (adds complexity)
- **Bypass via DB** — after browser confirms payment, directly update booking status via supabaseAdmin
- **Hybrid** — test the browser flow up to success step, then verify DB state separately

### 3. ISR cache on teacher profile
The `/[slug]` page uses ISR (`revalidate: 3600`). A freshly seeded teacher may not appear until the cache refreshes. Use `?_vercel_no_cache=1` or hit the page before the test with a cache-bust.

**For local dev**: ISR is effectively disabled (pages are server-rendered on each request), so this is only a production concern.

### 4. Auth state management
The test needs two auth contexts: parent (for booking) and teacher (for cancellation). Playwright's `browser.newContext()` or `storageState` can manage separate sessions.

### 5. Cleanup between test runs
Test data (bookings, users) must be cleaned up to prevent `bookings_unique_slot` constraint violations on re-runs.

### 6. Stripe test account for teacher
The teacher needs `stripe_account_id` pointing to a real Stripe Connect test account. This can't be faked — the `create-intent` route creates a real PaymentIntent with `transfer_data.destination`. Without a valid account, PI creation returns a Stripe error.

### 7. window.confirm dialog
`ConfirmedSessionCard` uses `window.confirm` for cancellation. Playwright handles this via `page.on('dialog', dialog => dialog.accept())`.

## File Inventory

### Files to Create
| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright config — webServer, baseURL, testDir, projects |
| `tests/e2e/booking-e2e.spec.ts` | Main E2E test spec |
| `tests/e2e/helpers/seed.ts` | Test data seeding/cleanup helpers |
| `tests/e2e/helpers/stripe.ts` | Stripe test helpers (PI verification, cleanup) |
| `tests/e2e/helpers/email.ts` | Email verification helpers (Resend API polling) |
| `package.json` | Add `@playwright/test` devDep, `test:e2e` script |

### Files to Modify
| File | Change |
|------|--------|
| `.gitignore` | Add `test-results/`, `playwright-report/`, `.playwright/` |

### Files to Read (Reference)
| File | Why |
|------|-----|
| `src/components/profile/BookingCalendar.tsx` | Step machine flow, form fields, selectors |
| `src/components/profile/PaymentStep.tsx` | Stripe Elements structure |
| `src/components/auth/InlineAuthForm.tsx` | Auth form fields, labels |
| `src/components/dashboard/ConfirmedSessionCard.tsx` | Cancel button, confirm dialog |
| `src/app/(dashboard)/dashboard/sessions/page.tsx` | Sessions page structure |
| `src/app/api/direct-booking/create-intent/route.ts` | PI creation flow |
| `src/app/api/stripe/webhook/route.ts` | Webhook confirmation flow |
| `src/lib/email.ts` | Email sending functions |

## Natural Seams for Task Decomposition

### T01: Playwright Infrastructure Setup
- Install `@playwright/test`, create config, update package.json scripts
- Create test directory structure (`tests/e2e/`, `tests/e2e/helpers/`)
- Set up global setup/teardown for data seeding
- Create seed helpers (test teacher, availability, cleanup)
- Verify: `npx playwright test --list` shows test files
- **Risk**: Low — standard Playwright setup

### T02: Core Booking Flow E2E Test
- Navigate to teacher profile
- Select date + time slot
- Fill booking form
- Sign up as test parent (InlineAuthForm)
- Fill Stripe test card via iframe locators
- Verify success step renders
- **Risk**: Medium — Stripe iframe interaction is the trickiest part

### T03: Email Verification & Cancellation
- After booking, verify confirmation email via Resend API
- Sign in as test teacher
- Navigate to sessions, find booking, cancel
- Accept dialog
- Verify cancellation email via Resend API
- Clean up test data
- **Risk**: Medium — depends on webhook timing and Resend API availability

**Alternative task split**: T02 and T03 could be a single test (serial steps in one spec file) since the cancellation depends on the booking created in T02. Split them as separate `test()` blocks within one `test.describe()` using `test.describe.serial()` for ordered execution.

## Skills Discovered

- **Playwright Best Practices** (`currents-dev/playwright-best-practices-skill@playwright-best-practices`) — installed globally. 20.6K installs. Covers Playwright config, selectors, assertions, and anti-patterns. Should be loaded by executor agents when writing test code.
- **Stripe Best Practices** — already available in `<available_skills>` as `stripe-best-practices`.

## Sources
- Resend E2E testing docs: https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright — `delivered@resend.dev` test address, Playwright config template
- Resend List Emails endpoint: https://resend.com/changelog/list-sent-emails-endpoint — `GET /emails` returns last 20 sent emails, individual email retrieval via `emails.get(id)`
- Playwright frame locator docs: https://github.com/microsoft/playwright — `page.frameLocator('iframe').getByRole()` for Stripe Elements iframe interaction
- Playwright webServer config: https://github.com/microsoft/playwright — `webServer.command`, `baseURL`, `reuseExistingServer`
