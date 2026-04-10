---
id: S03
parent: M015
milestone: M015
provides:
  - src/lib/rate-limit.ts with checkLimit(ip, endpointKey, { max, window }) export
  - Duration type re-export for callers
  - Factory-cached Ratelimit instances per {max, window} tuple
  - Fail-open error handling pattern (missing env vars → warn, Redis error → Sentry + allow)
requires:
  []
affects:
  - S04
key_files:
  - src/lib/rate-limit.ts
  - tests/unit/rate-limit.test.ts
  - .env.example
  - package.json
key_decisions:
  - Used Upstash Duration type instead of plain string for window parameter — required by SDK type system
  - Re-exported Duration type from rate-limit.ts so callers don't need to import @upstash/ratelimit directly
  - Used class-based mock pattern (vi.hoisted + MockRatelimit class) matching established Resend mock pattern
patterns_established:
  - Upstash rate limiter factory pattern with Map-based instance caching
  - Fail-open rate limiting: never block traffic due to infrastructure failure
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-10T04:58:08.678Z
blocker_discovered: false
---

# S03: Rate Limiting Primitive

**Delivered a distributed rate-limiting helper at src/lib/rate-limit.ts backed by Upstash Redis with factory-cached sliding window limiter, fail-open error handling, and a 6-case unit test suite.**

## What Happened

Installed @upstash/redis (v1.37.0) and @upstash/ratelimit (v2.0.8). Created src/lib/rate-limit.ts exporting `checkLimit(ip, endpointKey, { max, window })` — the API S04 will wire to public endpoints.

The module uses a factory pattern: Ratelimit instances are cached in a Map keyed by `${max}:${window}` so multiple endpoints with the same config share one client, while endpoints with different limits get their own. The `window` parameter uses Upstash's `Duration` template literal type (re-exported from the module) rather than plain string — this was a deviation from the task plan but required by the SDK's type system.

Fail-open behavior follows the project's safe-default-on-error pattern: if Upstash env vars are missing, `console.warn` and return `{ allowed: true }`. If Redis throws at runtime, `captureException` to Sentry and return `{ allowed: true }`. Traffic is never blocked due to rate-limiter infrastructure failure.

The test suite (tests/unit/rate-limit.test.ts) covers 6 cases with fully mocked Upstash: allow under limit, block over limit, composite key format verification, independent endpoint keys, fail-open on Redis error with Sentry reporting, and fail-open on missing env vars with console.warn. The mock pattern uses vi.hoisted() with a class-based mock for Ratelimit (matches the Resend mock pattern from KNOWLEDGE.md).

The old in-memory rate limiter at src/lib/utils/rate-limit.ts was intentionally left untouched — S04 will migrate callers. Env vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are documented in .env.example.

## Verification

All slice plan verification checks passed:
- `npm run build` exits 0 (no type errors)
- `npx vitest run tests/unit/rate-limit.test.ts` — 6/6 tests pass
- `grep -q 'checkLimit' src/lib/rate-limit.ts` — export confirmed
- `grep -q 'UPSTASH_REDIS_REST_URL' .env.example` — env var documented
- `git diff src/lib/utils/rate-limit.ts` — old rate-limit.ts unchanged

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Used Upstash Duration type instead of plain string for the window parameter. The task plan specified string but the SDK requires the Duration template literal type.

## Known Limitations

None.

## Follow-ups

S04 wires checkLimit to public endpoints (/api/waitlist, /api/track-view, /api/verify-email, login action). UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in Vercel production env vars before S04 deploys.

## Files Created/Modified

- `src/lib/rate-limit.ts` — New distributed rate-limiting module with checkLimit export, factory-cached sliding window limiter, and fail-open error handling
- `tests/unit/rate-limit.test.ts` — 6-case unit test suite covering allow, block, composite keys, fail-open on error, and fail-open on missing env vars
- `.env.example` — Added UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN placeholder entries
- `package.json` — Added @upstash/redis and @upstash/ratelimit dependencies
