---
id: T01
parent: S03
milestone: M015
key_files:
  - src/lib/rate-limit.ts
  - .env.example
  - package.json
  - package-lock.json
key_decisions:
  - Used Upstash Duration type instead of plain string for window param
  - Re-exported Duration type from rate-limit.ts so callers don't import @upstash/ratelimit directly
duration: 
verification_result: passed
completed_at: 2026-04-10T04:51:03.570Z
blocker_discovered: false
---

# T01: Installed @upstash/redis and @upstash/ratelimit, created src/lib/rate-limit.ts with checkLimit export using factory-cached sliding window limiter and fail-open error handling

**Installed @upstash/redis and @upstash/ratelimit, created src/lib/rate-limit.ts with checkLimit export using factory-cached sliding window limiter and fail-open error handling**

## What Happened

Installed @upstash/redis (v1.37.0) and @upstash/ratelimit (v2.0.8). Created src/lib/rate-limit.ts with the checkLimit(ip, endpointKey, { max, window }) API. The module caches Ratelimit instances in a Map keyed by "max:window" to avoid redundant Redis clients. Fixed a type error where slidingWindow expects Upstash's Duration template literal type, not plain string — imported and re-exported Duration for downstream callers. Created .env.example with Upstash env var placeholders. Old src/lib/utils/rate-limit.ts left untouched.

## Verification

npm run build exits 0 (26.5s), grep confirms checkLimit export exists, grep confirms UPSTASH_REDIS_REST_URL in .env.example, git diff confirms old rate-limit.ts unchanged.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 26500ms |
| 2 | `grep -q 'checkLimit' src/lib/rate-limit.ts` | 0 | ✅ pass | 100ms |
| 3 | `grep -q 'UPSTASH_REDIS_REST_URL' .env.example` | 0 | ✅ pass | 100ms |
| 4 | `git diff src/lib/utils/rate-limit.ts` | 0 | ✅ pass | 100ms |

## Deviations

Used Duration type from @upstash/ratelimit instead of plain string for the window parameter — task plan specified string but slidingWindow requires the template literal Duration type.

## Known Issues

None.

## Files Created/Modified

- `src/lib/rate-limit.ts`
- `.env.example`
- `package.json`
- `package-lock.json`
