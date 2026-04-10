---
verdict: needs-attention
remediation_round: 0
---

# Milestone Validation: M015

## Success Criteria Checklist
## Success Criteria (derived from Slice "After this" demos)

- [x] **S01 — DMARC record live:** `dig TXT _dmarc.tutelo.app` returns valid `v=DMARC1; p=none; ...` record. Confirmed in slice summary and UAT.
- [x] **S01 — Resend webhook endpoint:** `/api/webhooks/resend` deployed, returns 401 for unsigned requests. File exists on disk, curl verification in summary.
- [x] **S01 — Sentry alerting:** Bounce/complaint/delay events routed to Sentry with `email_event` and `email_id` tags. Code confirmed; production observation is post-deploy.
- [x] **S02 — Sentry.withMonitor on all 4 cron routes:** `grep -c withMonitor` = 1 per route file. Confirmed on disk.
- [x] **S02 — Schedules match vercel.json:** Monitor configs use the correct crontab values per route. Confirmed in summary.
- [x] **S02 — Heartbeat mechanism for silent failure detection:** Sentry Crons heartbeats configured with failureIssueThreshold:2 / recoveryThreshold:1. Confirmed in code.
- [ ] **S02 — Manual trigger with 200 in logs:** Post-deploy action documented in runbook but not yet executed. ⚠️ Deferred to deploy.
- [x] **S03 — Rate-limiting helper at src/lib/rate-limit.ts:** `checkLimit(ip, endpointKey, { max, window })` exported. Confirmed on disk.
- [x] **S03 — Distributed store (Upstash Redis):** @upstash/redis and @upstash/ratelimit installed, factory-cached sliding window limiter. Confirmed.
- [x] **S04 — Rate limits wired to 4 public endpoints:** `grep -c checkLimit` confirms 2+ references in each of waitlist, track-view, verify-email, auth.ts. Confirmed on disk.
- [x] **S04 — Burst traffic returns 429:** 10 wiring tests cover allowed and blocked paths for all 4 endpoints. Confirmed.
- [x] **S05 — Playwright E2E test suite exists:** 11 tests across 2 describe blocks. Config, spec, and 3 helper modules confirmed on disk.
- [x] **S05 — Booking lifecycle covered:** Profile → calendar → form → auth → payment → DB verify → webhook sim → teacher cancel. 10/11 pass.
- [ ] **S05 — "All green":** 1 test skipped (Stripe PaymentElement iframe). Email checks are soft-asserted (warn, don't fail). ⚠️ Demo claim overstates — documented deviation D063.

## Slice Delivery Audit
## Slice Delivery Audit

| Slice | Claimed Deliverable | Evidence | Status |
|-------|-------------------|----------|--------|
| S01 | DMARC record + Resend webhook + Sentry alerting | DMARC TXT record live, `/api/webhooks/resend/route.ts` on disk (2278 bytes), 8 webhook tests pass, Svix verification logic, selective Sentry alerting for bounce/complaint/delay | ✅ Delivered |
| S02 | Sentry.withMonitor on 4 cron routes + runbook | 1 withMonitor call per route confirmed, monitor configs match vercel.json, 23 cron tests pass, runbook at expected path | ✅ Delivered |
| S03 | Distributed rate-limit primitive | `checkLimit` exported from `src/lib/rate-limit.ts`, Upstash deps installed, factory caching, fail-open error handling (lines 65-66, 80-81), 6 unit tests pass | ✅ Delivered |
| S04 | Rate limits wired to public endpoints | All 4 endpoints import and call checkLimit, per-endpoint limits configured (5/30/5/10 per min), 10 wiring tests pass, 514 total tests pass, build succeeds | ✅ Delivered |
| S05 | E2E Playwright booking test | playwright.config.ts + spec + 3 helpers on disk, 10/11 tests pass (1 skipped: Stripe iframe), test:e2e script in package.json | ✅ Delivered (with documented deviation) |

**Note on S04 summary inaccuracy:** S04 "Known Limitations" claims "Rate limiting fails closed if Upstash Redis is unreachable." This is factually incorrect — `src/lib/rate-limit.ts` lines 58-83 wrap the entire flow in try/catch and return `{ allowed: true }` on any error, including Redis failures. The module already fails open. The S04 "Follow-ups" suggesting a try/catch wrapper are unnecessary — it already exists in S03's module.

## Cross-Slice Integration
## Cross-Slice Integration

**S03 → S04:** S03 produces `checkLimit` at `src/lib/rate-limit.ts`. S04 consumes it in 4 endpoints. Confirmed: all 4 files import from `@/lib/rate-limit` and call `checkLimit`. Integration is clean — no boundary mismatch.

**S01, S02:** Independent slices with no cross-slice dependencies. No integration concerns.

**S05:** Independent E2E test slice. Tests the booking flow (pre-existing feature), not M015's new features specifically. No integration concerns.

No boundary mismatches detected.

## Requirement Coverage
## Requirement Coverage

M015 is an infrastructure/hardening milestone — no active requirements in REQUIREMENTS.md reference M015 scope directly. The milestone addresses operational gaps (email deliverability monitoring, cron observability, rate limiting, E2E testing) rather than user-facing features.

No requirements were advanced, validated, or invalidated by any slice. This is expected for a hardening milestone.

## Verification Class Compliance
## Verification Class Compliance

### Contract ✅ (mostly met)
- S01: `dig TXT` confirmed, webhook curl returns 401 for unsigned requests ✅. Sentry test event receipt is post-deploy ⚠️.
- S02: withMonitor wrapping confirmed in code. Production curl triggers are post-deploy ⚠️.
- S03: 6 unit tests prove allow/block/fail-open behavior ✅.
- S04: 10 unit tests prove allowed and blocked paths for all 4 endpoints ✅. Manual burst test not documented ⚠️.
- S05: `npx playwright test --list` discovers 11 tests. Suite runs 10 passed, 1 skipped ✅.

### Integration ✅ (met)
- S01: Email deliverability monitored via DMARC + webhook → Sentry ✅.
- S02: Background jobs have Sentry Crons heartbeat monitoring ✅.
- S03: Rate-limiting primitive available, tested, and consumed by S04 ✅.
- S04: Primitive wired to all 4 public endpoints with correct limits ✅.
- S05: Full user journey tested end-to-end (minus Stripe card fill) ✅.

### Operational ⚠️ (gaps documented)
- S01/S02: Post-deploy verification (Sentry events, cron heartbeats) pending — expected for a milestone that hasn't been deployed yet.
- "E2E test failures block CI" stated as an operational expectation but **no CI pipeline (GitHub Actions workflow) exists**. The `test:e2e` script is in package.json but is not integrated into any automated pipeline. This is a gap — the E2E test can only be run manually.
- Rate-limit triggers → Sentry: `captureException` exists in the module ✅.

### UAT ✅ (met)
- S05 IS the UAT — the Playwright test suite exercises the full booking lifecycle. 10/11 tests pass with 1 documented skip (Stripe iframe, D063).


## Verdict Rationale
**Verdict: needs-attention.** All five slices delivered their code artifacts. 514 unit tests pass, the build succeeds, and all key files exist on disk. The two attention items are:

1. **Operational gap — no CI integration for E2E tests.** The operational verification class states "E2E test failures block CI" but no GitHub Actions workflow exists. The test can only be run manually via `npx playwright test`. This is not blocking for milestone completion but should be tracked for a future milestone.

2. **S04 summary documentation inaccuracy.** The "Known Limitations" section incorrectly states the rate limiter fails closed on Redis errors. The module at `src/lib/rate-limit.ts` lines 58-83 already fails open via try/catch. The "Follow-ups" suggesting this fix are unnecessary. This is a prose error, not a code defect.

3. **S05 demo claim overstatement.** The roadmap says "All green" but 1 test is skipped (Stripe iframe) and email verifications are soft-asserted. This is a pragmatic and well-documented deviation (D063), not a material gap.

4. **Post-deploy verification pending.** S01 Sentry events and S02 cron heartbeats require production deployment to verify. This is expected and documented in slice summaries/runbooks.

None of these gaps block milestone completion. The code is delivered, tested, and correct.
