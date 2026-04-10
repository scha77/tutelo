---
id: T03
parent: S01
milestone: M015
key_files:
  - src/__tests__/resend-webhook.test.ts
key_decisions:
  - Used vi.hoisted() for mock variable references — standard pattern for this codebase
duration: 
verification_result: passed
completed_at: 2026-04-10T04:06:00.933Z
blocker_discovered: false
---

# T03: 8 integration tests cover all webhook handler paths: valid/invalid signatures, bounce/complaint/delay alerting, delivered/opened silence, missing secret.

**8 integration tests cover all webhook handler paths: valid/invalid signatures, bounce/complaint/delay alerting, delivered/opened silence, missing secret.**

## What Happened

Created `src/__tests__/resend-webhook.test.ts` with 8 test cases exercising the full POST handler logic. Used `vi.hoisted()` pattern for mock variables (same pattern documented in KNOWLEDGE.md). Tests cover: missing svix headers → 401, invalid signature → 401, bounced/complained/delivery_delayed → 200 + Sentry captureMessage with correct tags, delivered/opened → 200 + NO Sentry call, missing RESEND_WEBHOOK_SECRET → 500. All 8 pass.

## Verification

npx vitest run src/__tests__/resend-webhook.test.ts — 8 tests pass in 1.18s.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/resend-webhook.test.ts` | 0 | ✅ pass | 1180ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/__tests__/resend-webhook.test.ts`
