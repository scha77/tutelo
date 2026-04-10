---
id: T01
parent: S05
milestone: M015
key_files:
  - playwright.config.ts
  - tests/e2e/helpers/seed.ts
  - tests/e2e/helpers/email.ts
  - tests/e2e/helpers/auth.ts
  - tests/e2e/booking-e2e.spec.ts
  - package.json
  - .gitignore
key_decisions:
  - Seed helper creates both auth user and teacher row for teacher login in T02/T03
  - E2E helpers use direct supabase-js createClient, not app's service.ts, to decouple from Next.js
duration: 
verification_result: passed
completed_at: 2026-04-10T06:07:47.324Z
blocker_discovered: false
---

# T01: Installed Playwright with Chromium, created config, built seed/email/auth helpers, and added placeholder spec discovered by npx playwright test --list

**Installed Playwright with Chromium, created config, built seed/email/auth helpers, and added placeholder spec discovered by npx playwright test --list**

## What Happened

Installed @playwright/test as devDependency and Chromium browser. Created playwright.config.ts with testDir tests/e2e, webServer on port 3000 with reuseExistingServer, single Chromium project, 60s timeout. Built three helper modules: seed.ts (auth user + teacher row upsert, 7-day availability seeding, cleanup), email.ts (Resend API polling with configurable timeout), auth.ts (admin user deletion by email). Added test:e2e script to package.json, updated .gitignore with Playwright artifacts, created placeholder booking-e2e.spec.ts that Playwright discovers.

## Verification

npx playwright test --list discovers booking-e2e.spec.ts (1 test in 1 file). Grep verification passes. TypeScript compilation of all test files produces no errors. package.json has test:e2e script. .gitignore has Playwright artifact patterns.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx playwright test --list 2>&1 | grep -q 'booking-e2e' && echo PASS || echo FAIL` | 0 | ✅ pass | 2000ms |
| 2 | `npx tsc --noEmit tests/e2e/helpers/*.ts tests/e2e/booking-e2e.spec.ts 2>&1 | grep tests/` | 0 | ✅ pass | 3000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `playwright.config.ts`
- `tests/e2e/helpers/seed.ts`
- `tests/e2e/helpers/email.ts`
- `tests/e2e/helpers/auth.ts`
- `tests/e2e/booking-e2e.spec.ts`
- `package.json`
- `.gitignore`
