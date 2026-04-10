---
estimated_steps: 35
estimated_files: 4
skills_used: []
---

# T01: Install Upstash packages and implement checkLimit module

## Description

Install `@upstash/redis` and `@upstash/ratelimit`, then create `src/lib/rate-limit.ts` with the `checkLimit()` export. The module uses a factory pattern — caching `Ratelimit` instances in a `Map` keyed by `${max}:${window}` so different endpoints can have different limits without creating redundant instances.

The module must fail open: if Upstash env vars are missing, log a warning and return `{ allowed: true }`. If a Redis call throws at runtime, catch it, report to Sentry, and return `{ allowed: true }`. This matches the project's safe-default-on-error pattern (see KNOWLEDGE.md).

The old `src/lib/utils/rate-limit.ts` stays untouched — S04 migrates callers.

## Steps

1. Run `npm install @upstash/redis @upstash/ratelimit`
2. Create `src/lib/rate-limit.ts` with:
   - Import `Ratelimit` from `@upstash/ratelimit` and `Redis` from `@upstash/redis`
   - Import `captureException` from `@sentry/nextjs`
   - A module-level `Map<string, Ratelimit>` for instance caching
   - A `getOrCreateLimiter(max, window)` helper that looks up or creates a `new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(max, window) })`
   - Export `async function checkLimit(ip: string, endpointKey: string, opts: { max: number; window: string }): Promise<{ allowed: boolean; remaining?: number; reset?: number }>`
   - `checkLimit` builds a composite key `${endpointKey}:${ip}`, calls `limiter.limit(key)`, and returns `{ allowed: result.success, remaining: result.remaining, reset: result.reset }`
   - Wrap the entire body in try/catch. On error: `captureException(error)`, return `{ allowed: true }`
   - Before any Redis call, check `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN`. If either is missing, `console.warn('Rate limiting disabled: missing UPSTASH env vars')` and return `{ allowed: true }`
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example` with placeholder comments
4. Run `npm run build` to verify TypeScript compiles clean

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Upstash Redis | catch → Sentry + return allowed:true | same (HTTP timeout = error) | same |
| Env vars | missing → warn + return allowed:true | N/A | N/A |

## Must-Haves

- [ ] `@upstash/redis` and `@upstash/ratelimit` installed in package.json
- [ ] `src/lib/rate-limit.ts` exports `checkLimit` with correct signature
- [ ] Factory pattern caches Ratelimit instances per `{max, window}` tuple
- [ ] Fail-open on missing env vars (console.warn + allowed:true)
- [ ] Fail-open on Redis error (Sentry + allowed:true)
- [ ] Env vars documented in `.env.example`
- [ ] `npm run build` passes

## Verification

- `npm run build` exits 0
- `grep -q 'checkLimit' src/lib/rate-limit.ts` confirms export exists
- `grep -q 'UPSTASH_REDIS_REST_URL' .env.example` confirms env var documented
- Old `src/lib/utils/rate-limit.ts` unchanged: `git diff src/lib/utils/rate-limit.ts` shows no changes

## Inputs

- ``src/lib/utils/rate-limit.ts` — existing in-memory rate limiter (reference for API shape, DO NOT modify)`
- ``.env.example` — add Upstash env var placeholders`

## Expected Output

- ``src/lib/rate-limit.ts` — new distributed rate limiter module`
- ``.env.example` — updated with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN`
- ``package.json` — @upstash/redis and @upstash/ratelimit added`

## Verification

npm run build && grep -q 'checkLimit' src/lib/rate-limit.ts && grep -q 'UPSTASH_REDIS_REST_URL' .env.example
