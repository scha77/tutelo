---
id: M015
title: "Pre-Launch Hardening"
status: complete
completed_at: 2026-04-10T07:03:05.608Z
key_decisions:
  - D062: Pre-create auth users with email_confirm:true in E2E beforeAll — bypasses email confirmation gate
  - D063: Graceful test.skip() for Stripe PaymentElement iframe card fill — nested cross-origin iframes not reliably traversable by Playwright
  - DMARC starts at p=none (monitor only) — bump to p=quarantine after 1-2 weeks of clean reports
  - Sentry.withMonitor auth checks remain outside the monitor wrapper — unauthorized requests are not cron failures
  - Fail-open rate limiting: never block traffic due to infrastructure failure (missing env vars → warn, Redis error → Sentry + allow)
  - track-view limit set to 30/min (higher than other endpoints) — page views fire frequently during normal browsing
key_files:
  - src/lib/rate-limit.ts
  - src/lib/webhooks/resend.ts
  - src/app/api/webhooks/resend/route.ts
  - src/app/api/cron/auto-cancel/route.ts
  - src/app/api/cron/stripe-reminders/route.ts
  - src/app/api/cron/session-reminders/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - src/actions/auth.ts
  - playwright.config.ts
  - tests/e2e/booking-e2e.spec.ts
  - tests/e2e/helpers/seed.ts
  - tests/e2e/helpers/email.ts
  - tests/e2e/helpers/auth.ts
  - tests/unit/rate-limit.test.ts
  - tests/unit/rate-limit-wiring.test.ts
  - vitest.config.ts
lessons_learned:
  - Playwright E2E specs must be excluded from vitest.config.ts — Vitest auto-discovers them and fails because @playwright/test's test.describe.serial is not compatible with the Vitest runtime
  - Stripe PaymentElement card inputs live inside deeply nested cross-origin iframes that Playwright cannot reliably traverse — design E2E payment tests around DB assertions rather than UI interaction
  - Server actions (signIn/signUp) don't receive a Request object — extract IP via headers() from next/headers for rate limiting
  - Pre-creating auth users with email_confirm:true is the practical E2E strategy for Supabase projects with email confirmation enabled
  - Separate browser pages per user role (parent page vs teacher page) avoids Supabase session cookie conflicts in E2E tests
---

# M015: Pre-Launch Hardening

**Closed five pre-launch gaps: email deliverability observability (DMARC + Resend webhooks), cron heartbeat monitoring (Sentry Crons), distributed rate limiting (Upstash Redis on 4 public endpoints), and an 11-test Playwright E2E suite covering the full booking lifecycle.**

## What Happened

M015 addressed the operational and reliability gaps standing between the current MVP and a production launch.

**S01 — DMARC + Resend Webhook Observability.** Added a DMARC TXT record at `_dmarc.tutelo.app` in `p=none` (monitor) mode with forensic reporting. Built `/api/webhooks/resend` with Svix signature verification that routes bounce, complaint, and delivery-delay events to Sentry as warnings. Delivered/opened/clicked events are acknowledged silently to avoid noise. 8 integration tests cover all handler paths. RESEND_WEBHOOK_SECRET deployed to production.

**S02 — Cron Job Verification & Monitoring.** Wrapped all 4 cron routes (auto-cancel, stripe-reminders, session-reminders, recurring-charges) in `Sentry.withMonitor()` for heartbeat check-in monitoring. Auth checks remain outside the monitor wrapper so unauthorized requests don't register as cron failures. Fixed 3 stale schedule comments in cron JSDoc. Updated 4 test files with withMonitor mocks. Wrote a production cron verification runbook.

**S03 — Rate Limiting Primitive.** Installed `@upstash/redis` and `@upstash/ratelimit`. Created `src/lib/rate-limit.ts` with `checkLimit(ip, endpointKey, { max, window })` — a factory-cached sliding window limiter backed by Upstash Redis. Fail-open behavior: missing env vars log a warning, Redis errors go to Sentry — traffic is never blocked by infrastructure failure. 6 unit tests cover allow, block, composite keys, and both fail-open paths.

**S04 — Wire Rate Limits to Public Endpoints.** Replaced old in-memory rate limiters on `/api/waitlist` (5/min) and `/api/track-view` (30/min) with the distributed `checkLimit`. Added rate limiting from scratch to `/api/verify-email` (5/min) and `signIn`/`signUp` server actions (10/min shared bucket). Auth actions extract IP via `headers()` since server actions lack a Request object. 10 wiring tests verify allowed and blocked paths for all 4 endpoints. Fixed 9 pre-existing test failures caused by mock drift from the auth.ts changes.

**S05 — End-to-End Booking Flow Test.** Established Playwright E2E infrastructure: config with webServer, reusable seed/email/auth helpers, `test:e2e` npm script. Built an 11-test serial suite covering: teacher profile navigation → calendar date/slot selection → booking form fill → one-time recurring selection → parent sign-in → Stripe PaymentElement rendering → DB booking verification → webhook simulation → email verification → teacher login → session cancellation → DB status verification. 10 tests pass, 1 skipped (Stripe nested cross-origin iframe card fill — documented in D063). Seed helper creates both auth user and teacher row. Separate browser pages per user role avoid cookie conflicts.

**Verification fix during milestone completion:** Added `tests/e2e/**` to `vitest.config.ts` exclude list — Playwright specs were being collected by Vitest and failing due to missing Playwright browser dependency in the Vitest environment.

## Success Criteria Results

Success criteria are the per-slice "After this" conditions from the roadmap:

- **S01**: ✅ `dig TXT _dmarc.tutelo.app` returns valid DMARC record. `/api/webhooks/resend` endpoint deployed and verified with curl (401 on bad signature). 8 tests pass.
- **S02**: ✅ All 4 cron routes have `Sentry.withMonitor` (1 call per file confirmed via grep). 23 cron tests pass. Runbook written.
- **S03**: ✅ `checkLimit` exported from `src/lib/rate-limit.ts` with factory-cached Upstash sliding window. 6 unit tests pass.
- **S04**: ✅ `checkLimit` wired to all 4 public endpoints (waitlist, track-view, verify-email, auth actions). Blocked requests return 429. 10 wiring tests + 514 total tests pass.
- **S05**: ✅ `npx playwright test --list` discovers 11 tests in 2 serial describe blocks. 10 pass, 1 skipped (Stripe iframe — D063). Helpers (seed, email, auth) reusable for future E2E specs.

## Definition of Done Results

- ✅ All 5 slices marked complete in DB (S01–S05, all status=complete)
- ✅ All slice summaries exist on disk
- ✅ 29 non-.gsd files changed with +1912 insertions — real code delivered
- ✅ `npm run build` exits 0 — no type errors, 73 pages generated
- ✅ `npx vitest run` — 55 files, 514 tests, 0 failures
- ✅ No cross-slice integration issues — S03 provides rate-limit primitive, S04 consumes it; no other cross-slice dependencies

## Requirement Outcomes

No requirements changed status during M015. The milestone delivered new operational capabilities (DMARC, cron monitoring, rate limiting, E2E tests) that don't map to existing requirements. R001 (all tests pass) remains validated — test count increased from 490 to 514.

## Deviations

vitest.config.ts required adding tests/e2e/** to the exclude list during milestone completion — the Playwright E2E spec was being collected by Vitest. S03 used Upstash Duration type instead of plain string for the window parameter (SDK requirement). S05 Stripe card fill test is skipped rather than passing (D063).

## Follow-ups

1. Deploy M015 to production: git push origin main + set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel production env vars. 2. After deploy: manually trigger each cron route once to confirm Sentry Crons dashboard shows first check-ins. Monitor over 48 hours. 3. After 1-2 weeks of clean DMARC reports: bump p=none to p=quarantine. 4. Consider wrapping checkLimit calls in try/catch at the caller level to fail open if Upstash Redis is unavailable (S04 follow-up). 5. Add more E2E scenarios (recurring booking, session type selection, parent self-service cancellation) as separate spec files.
