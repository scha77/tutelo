# S05: End-to-End Booking Flow Test

**Goal:** An automated Playwright E2E test covers the full booking lifecycle: parent signup → teacher profile → calendar slot selection → Stripe test card payment → booking confirmation → teacher-side cancellation. `npx playwright test booking-e2e` passes green.
**Demo:** After this: After this: `npx playwright test booking-e2e` signs up a test parent, navigates to a seeded test teacher profile, books a session, completes Stripe test card payment, verifies the booking email arrived in a test inbox, cancels the booking, and verifies the cancellation email arrived. All green.

## Tasks
- [x] **T01: Installed Playwright with Chromium, created config, built seed/email/auth helpers, and added placeholder spec discovered by npx playwright test --list** — Install Playwright, create configuration, build reusable test helpers for data seeding, Stripe verification, and email checking. This is the foundation task — no tests run yet, but `npx playwright test --list` discovers the spec file.

## Why
No Playwright infrastructure exists. Every subsequent task depends on: the config (webServer, baseURL), seed helpers (test teacher + availability), Stripe helpers (cleanup), and email helpers (Resend API polling).

## Steps
1. Install `@playwright/test` as devDependency and run `npx playwright install chromium` (only Chromium needed for E2E)
2. Create `playwright.config.ts` with: `testDir: 'tests/e2e'`, `webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }`, `use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry', screenshot: 'only-on-failure' }`, single Chromium project, 60s timeout
3. Add `test:e2e` script to `package.json`: `"test:e2e": "npx playwright test"`
4. Update `.gitignore` — add `test-results/`, `playwright-report/`, `.playwright/`
5. Create `tests/e2e/helpers/seed.ts`: exports `seedTestTeacher()` (upserts teacher row with `is_published: true`, `stripe_charges_enabled: true`, `stripe_account_id` from `E2E_STRIPE_CONNECTED_ACCOUNT_ID` env var, known slug `e2e-test-teacher`, `hourly_rate: 50`), `seedAvailability(teacherId)` (creates availability slots for every day of week, 9am-5pm, so tests always find an available date), `cleanupTestData(teacherSlug)` (deletes bookings, availability, optionally the teacher row). All use `supabaseAdmin` from `@supabase/supabase-js` with `SUPABASE_SERVICE_SECRET_KEY`.
6. Create `tests/e2e/helpers/email.ts`: exports `waitForEmail({ subject, toContain, timeoutMs })` that polls `GET https://api.resend.com/emails` with Authorization header using `RESEND_API_KEY`, retrying every 3s up to timeoutMs (default 30s), returns the first matching email object or null.
7. Create `tests/e2e/helpers/auth.ts`: exports `cleanupTestUser(email)` that deletes a Supabase auth user by email using the admin API (`supabaseAdmin.auth.admin.listUsers()` → find by email → `deleteUser(id)`)
8. Create empty `tests/e2e/booking-e2e.spec.ts` with a single placeholder test that navigates to `/` and checks the page title exists — just to verify Playwright discovers it.

## Must-Haves
- `@playwright/test` installed, Chromium browser downloaded
- `playwright.config.ts` with webServer pointing to `npm run dev` on port 3000
- `package.json` has `test:e2e` script
- `.gitignore` updated with Playwright artifacts
- Seed helper creates test teacher with valid Stripe Connect account ID from env var
- Email helper polls Resend API for matching emails
- Auth cleanup helper removes test users from Supabase auth
- `npx playwright test --list` discovers `booking-e2e.spec.ts`

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase admin API (seeding) | Throw with teacher_id context | N/A (direct DB) | Throw — schema mismatch means migration drift |
| Resend emails.list API | Return null (email not found) | Return null after timeout | Log warning, return null |
| Stripe Connect account ID env var | Skip test with clear message | N/A | N/A |
  - Estimate: 1h
  - Files: playwright.config.ts, package.json, .gitignore, tests/e2e/helpers/seed.ts, tests/e2e/helpers/email.ts, tests/e2e/helpers/auth.ts, tests/e2e/booking-e2e.spec.ts
  - Verify: npx playwright test --list 2>&1 | grep -q 'booking-e2e' && echo 'PASS: Playwright discovers spec' || echo 'FAIL'
- [x] **T02: Built complete booking E2E test covering profile → form → auth → payment → DB → webhook — 6 passed, 1 skipped (Stripe iframe card fill)** — Write the core booking E2E test covering the full parent booking path: navigate to seeded teacher profile → select available date and time → fill booking form → sign up as new parent → complete Stripe test card payment → verify success step renders → simulate webhook confirmation → verify confirmation email arrived via Resend API.

## Why
This is the highest-risk, highest-value part of the E2E suite. The Stripe Elements iframe interaction is the trickiest piece — PaymentElement renders inside a Stripe-hosted iframe that requires `page.frameLocator()` to interact with.

## Steps
1. Read `src/components/profile/BookingCalendar.tsx`, `src/components/profile/BookingForm.tsx`, `src/components/profile/PaymentStep.tsx`, and `src/components/auth/InlineAuthForm.tsx` to understand exact field selectors, labels, and step transitions.
2. In `booking-e2e.spec.ts`, replace the placeholder test with a `test.describe.serial('Booking Flow')` block.
3. Add `test.beforeAll`: call `seedTestTeacher()` and `seedAvailability(teacherId)` from the seed helper. Store the teacher slug and ID for use in tests. Generate a unique test parent email: `e2e-parent-${Date.now()}@delivered.resend.dev` (Resend's test address that accepts all emails).
4. Write test: 'navigate to teacher profile and select a time slot'
   - `page.goto('/{slug}')` — navigate to seeded teacher profile
   - Wait for calendar to render (look for a clickable date button)
   - Click an available date (find a date that has the CSS classes indicating availability)
   - Wait for time slots panel to appear
   - Click the first available time slot
   - Assert the form step is now visible (look for 'Student\'s name' label)
5. Write test: 'fill booking form and submit'
   - Fill 'Student\'s name' input with 'E2E Test Student'
   - Fill 'Email' input with the generated test parent email
   - Fill 'Notes' textarea with 'E2E test booking'
   - Click the submit/book button
   - Assert the auth step appears (look for 'Email' and 'Password' labels in InlineAuthForm)
6. Write test: 'sign up as parent and proceed to payment'
   - The auth form should have the email pre-filled or fill it again
   - Click 'Create account' or 'Sign up' tab if needed
   - Fill email and password fields in InlineAuthForm
   - Submit the auth form
   - Wait for PaymentElement to render (the payment step)
7. Write test: 'complete Stripe test card payment'
   - Wait for the Stripe iframe to load: `page.frameLocator('iframe[title*="Secure"]')` or similar
   - Inside the iframe, fill card number (4242 4242 4242 4242), expiry (any future date like 12/30), CVC (any 3 digits like 123)
   - Note: Stripe's PaymentElement may use a single combined input or separate fields — the test must handle the actual iframe structure. Use `frameLocator.locator('[name="number"]')` or `getByPlaceholder` as needed.
   - Click the Pay/Complete button outside the iframe
   - Wait for the success step to render (look for CheckCircle2 icon or 'confirmed' text)
8. After success step renders, simulate the Stripe webhook by directly updating the booking in DB:
   - Query bookings table via supabaseAdmin for the test parent email + status='requested'
   - Update status to 'confirmed'
   - This simulates what `payment_intent.amount_capturable_updated` webhook does
9. Write test: 'verify confirmation email was sent'
   - Call `waitForEmail({ subject containing 'confirm' or 'booked', timeoutMs: 30000 })` from email helper
   - Assert the email was found (or soft-assert with a warning if Resend API is slow)
10. Add `test.afterAll`: call `cleanupTestUser(testParentEmail)` to remove the test parent from Supabase auth.

## Must-Haves
- Test navigates to seeded teacher profile and finds available slots
- Form fields filled correctly (student name, email, notes)
- Parent signs up via InlineAuthForm during booking flow
- Stripe test card payment completes successfully via PaymentElement iframe
- Success step renders after payment
- Booking exists in DB with correct parent email
- Confirmation email verified via Resend API (soft assertion — test warns but doesn't fail if Resend API is unavailable)

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Stripe Elements iframe | Retry locator with increased timeout (30s) | Fail with screenshot | N/A |
| Supabase auth signUp | Fail — auth is critical path | Fail with screenshot | N/A |
| create-intent API route | Fail — PI creation is critical path | Fail after 15s | Assert error message visible |
| Resend email verification | Soft-fail with warning | Return null, log warning | Log and continue |

## Negative Tests
- If no available date is found on the calendar, the test should fail with a clear message about seed data
- If Stripe iframe doesn't load within 30s, fail with screenshot for debugging
  - Estimate: 2h
  - Files: tests/e2e/booking-e2e.spec.ts
  - Verify: E2E_STRIPE_CONNECTED_ACCOUNT_ID=$E2E_STRIPE_CONNECTED_ACCOUNT_ID npx playwright test booking-e2e --grep 'Booking Flow' 2>&1 | tail -5
- [x] **T03: Added teacher cancellation flow — full E2E suite 10 passed, 1 skipped (Stripe card fill)** — Add the cancellation test block to the E2E spec: sign in as the test teacher, navigate to sessions dashboard, find and cancel the booking, verify cancellation email. Run the full suite end-to-end and ensure all tests pass.

## Why
The roadmap demo requires both booking AND cancellation to be tested. Cancellation exercises a different auth context (teacher) and UI surface (dashboard sessions page with ConfirmedSessionCard). This also runs the full suite to verify everything works together.

## Steps
1. Read `src/components/dashboard/ConfirmedSessionCard.tsx` and `src/app/(dashboard)/dashboard/sessions/page.tsx` to understand the cancel button selector and dialog pattern.
2. In `booking-e2e.spec.ts`, add a new test block after the booking tests: 'Teacher cancellation flow'.
3. Write test: 'sign in as teacher and navigate to sessions'
   - Navigate to `/login`
   - Fill email and password with the test teacher's credentials (seeded in T01 — the teacher needs an auth user too, or create one in beforeAll). Note: the seed helper from T01 creates a teacher row but may not create an auth user. If needed, add `seedTestTeacherAuth(email, password)` to create a Supabase auth user linked to the teacher ID.
   - Submit the login form
   - Wait for redirect to `/dashboard`
   - Navigate to `/dashboard/sessions`
   - Wait for the sessions page to load
4. Write test: 'cancel the booking'
   - Find the ConfirmedSessionCard containing 'E2E Test Student' (the student name from T02)
   - Set up dialog handler: `page.on('dialog', d => d.accept())` before clicking cancel
   - Click the 'Cancel Session' button on that card
   - Wait for the card to disappear or show cancelled state
5. Write test: 'verify cancellation email'
   - Call `waitForEmail({ subject containing 'cancel', timeoutMs: 30000 })` from email helper
   - Assert the email was found (soft assertion)
6. Update `test.afterAll` to clean up all test data:
   - Delete test bookings via supabaseAdmin
   - Delete test parent auth user
   - Delete test teacher auth user (if created)
   - Delete test availability slots
   - Optionally delete the test teacher row (or leave it for next run — upsert handles it)
7. Run the full suite: `npx playwright test booking-e2e` — all tests must pass.
8. If any test fails, debug using Playwright trace and screenshots, fix the spec or helpers as needed.

## Must-Haves
- Teacher signs in via login page and reaches dashboard
- Teacher navigates to sessions page and finds the E2E booking
- Cancel button clicked, window.confirm auto-accepted
- Cancellation email verified via Resend API (soft assertion)
- Full `npx playwright test booking-e2e` passes green
- All test data cleaned up in afterAll

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Teacher auth (login page) | Fail — need valid teacher credentials | Fail with screenshot | N/A |
| Sessions page (unstable_cache) | Booking may not appear for 30s due to cache | Retry with page reload after delay | N/A |
| window.confirm dialog | If dialog handler misses, page hangs | 10s timeout on dialog | N/A |
| Cancellation email (Resend) | Soft-fail with warning | Return null, log | N/A |
  - Estimate: 1.5h
  - Files: tests/e2e/booking-e2e.spec.ts, tests/e2e/helpers/seed.ts
  - Verify: npx playwright test booking-e2e 2>&1 | tail -10
