---
estimated_steps: 58
estimated_files: 1
skills_used: []
---

# T02: Booking flow E2E test — profile through payment success

Write the core booking E2E test covering the full parent booking path: navigate to seeded teacher profile → select available date and time → fill booking form → sign up as new parent → complete Stripe test card payment → verify success step renders → simulate webhook confirmation → verify confirmation email arrived via Resend API.

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

## Inputs

- ``tests/e2e/helpers/seed.ts` — seedTestTeacher, seedAvailability, cleanupTestData`
- ``tests/e2e/helpers/email.ts` — waitForEmail helper`
- ``tests/e2e/helpers/auth.ts` — cleanupTestUser helper`
- ``tests/e2e/booking-e2e.spec.ts` — placeholder spec from T01`
- ``src/components/profile/BookingCalendar.tsx` — step machine, form fields, selectors`
- ``src/components/profile/BookingForm.tsx` — form field labels and IDs`
- ``src/components/profile/PaymentStep.tsx` — Stripe Elements structure, iframe`
- ``src/components/auth/InlineAuthForm.tsx` — auth form labels, email/password fields`

## Expected Output

- ``tests/e2e/booking-e2e.spec.ts` — complete booking flow E2E test (profile → form → auth → payment → success → email verification)`

## Verification

E2E_STRIPE_CONNECTED_ACCOUNT_ID=$E2E_STRIPE_CONNECTED_ACCOUNT_ID npx playwright test booking-e2e --grep 'Booking Flow' 2>&1 | tail -5
