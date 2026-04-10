---
estimated_steps: 27
estimated_files: 7
skills_used: []
---

# T01: Playwright infrastructure, config, and test helpers

Install Playwright, create configuration, build reusable test helpers for data seeding, Stripe verification, and email checking. This is the foundation task — no tests run yet, but `npx playwright test --list` discovers the spec file.

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

## Inputs

- ``src/lib/supabase/service.ts` — supabaseAdmin pattern for seed helpers`
- ``package.json` — existing scripts and dependencies`
- ``.gitignore` — existing ignore patterns`

## Expected Output

- ``playwright.config.ts` — Playwright configuration with webServer and Chromium project`
- ``tests/e2e/helpers/seed.ts` — test teacher and availability seeding/cleanup`
- ``tests/e2e/helpers/email.ts` — Resend API email verification polling`
- ``tests/e2e/helpers/auth.ts` — Supabase auth user cleanup`
- ``tests/e2e/booking-e2e.spec.ts` — placeholder spec file discovered by Playwright`
- ``package.json` — updated with @playwright/test devDep and test:e2e script`
- ``.gitignore` — updated with Playwright artifact patterns`

## Verification

npx playwright test --list 2>&1 | grep -q 'booking-e2e' && echo 'PASS: Playwright discovers spec' || echo 'FAIL'
