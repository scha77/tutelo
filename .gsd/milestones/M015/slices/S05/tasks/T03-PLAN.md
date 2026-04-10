---
estimated_steps: 43
estimated_files: 2
skills_used: []
---

# T03: Teacher cancellation flow and full suite green run

Add the cancellation test block to the E2E spec: sign in as the test teacher, navigate to sessions dashboard, find and cancel the booking, verify cancellation email. Run the full suite end-to-end and ensure all tests pass.

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

## Inputs

- ``tests/e2e/booking-e2e.spec.ts` — booking flow tests from T02`
- ``tests/e2e/helpers/seed.ts` — seed and cleanup helpers from T01`
- ``tests/e2e/helpers/email.ts` — email verification helper from T01`
- ``tests/e2e/helpers/auth.ts` — auth cleanup helper from T01`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — cancel button, confirm dialog pattern`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — sessions page structure, ConfirmedSessionCard usage`
- ``src/app/(auth)/login/page.tsx` — login page form structure`

## Expected Output

- ``tests/e2e/booking-e2e.spec.ts` — complete E2E spec with booking + cancellation + email verification, all passing`
- ``tests/e2e/helpers/seed.ts` — updated with teacher auth seeding if needed`

## Verification

npx playwright test booking-e2e 2>&1 | tail -10
