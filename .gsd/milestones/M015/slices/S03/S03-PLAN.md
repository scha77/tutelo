# S03: Rate Limiting Primitive

**Goal:** A distributed rate-limiting helper at `src/lib/rate-limit.ts` backed by Upstash Redis, with `checkLimit(ip, endpointKey, { max, window })` API, factory pattern for per-config instances, and fail-open error handling.
**Demo:** After this: After this: A rate-limiting helper is available at `src/lib/rate-limit.ts` backed by a distributed store. Calling `checkLimit(ip, 'endpoint-key', { max: 10, window: '1m' })` returns allowed/blocked.

## Tasks
- [x] **T01: Installed @upstash/redis and @upstash/ratelimit, created src/lib/rate-limit.ts with checkLimit export using factory-cached sliding window limiter and fail-open error handling** — ## Description

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
  - Estimate: 30m
  - Files: src/lib/rate-limit.ts, .env.example, package.json, package-lock.json
  - Verify: npm run build && grep -q 'checkLimit' src/lib/rate-limit.ts && grep -q 'UPSTASH_REDIS_REST_URL' .env.example
- [ ] **T02: Unit tests for checkLimit with mocked Upstash** — ## Description

Write `tests/unit/rate-limit.test.ts` to validate the `checkLimit` contract with fully mocked Upstash. No live Redis connection needed.

The mock pattern must handle `@upstash/ratelimit` exporting a class (`new Ratelimit(...)`) — use a class-based mock similar to the Resend mock pattern established in KNOWLEDGE.md. The `Ratelimit.slidingWindow` static method must also be mocked.

Also mock `@sentry/nextjs` to verify `captureException` is called on failure.

## Steps

1. Create `tests/unit/rate-limit.test.ts`
2. Use `vi.hoisted()` to define mock variables:
   - `limitMock = vi.fn()` — the `.limit()` method
   - A `MockRatelimit` class with a `limit` method that delegates to `limitMock`
   - Add a static `slidingWindow` method on `MockRatelimit` that returns a dummy value
   - `captureExceptionMock = vi.fn()`
3. `vi.mock('@upstash/ratelimit', ...)` returning `{ Ratelimit: MockRatelimit }`
4. `vi.mock('@upstash/redis', ...)` returning `{ Redis: { fromEnv: vi.fn(() => ({})) } }`
5. `vi.mock('@sentry/nextjs', ...)` returning `{ captureException: captureExceptionMock }`
6. Set `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN` in `beforeEach`, clean up in `afterEach`
7. Write test cases:
   - **'allows requests under the limit'**: `limitMock` returns `{ success: true, remaining: 9, reset: Date.now() + 60000 }` → expect `{ allowed: true, remaining: 9 }`
   - **'blocks requests over the limit'**: `limitMock` returns `{ success: false, remaining: 0, reset: ... }` → expect `{ allowed: false, remaining: 0 }`
   - **'uses composite key (endpointKey:ip)'**: call `checkLimit('1.2.3.4', 'waitlist', ...)` → assert `limitMock` was called with `'waitlist:1.2.3.4'`
   - **'independent endpoint keys'**: two calls with different endpointKeys → `limitMock` called with different composite keys
   - **'fails open on Redis error'**: `limitMock` throws `new Error('connection refused')` → expect `{ allowed: true }` + `captureExceptionMock` called
   - **'fails open when env vars missing'**: delete `process.env.UPSTASH_REDIS_REST_URL` → expect `{ allowed: true }` + no `captureException` call (just console.warn)
8. Run `npx vitest run tests/unit/rate-limit.test.ts` — all pass

## Negative Tests

- **Error paths**: Redis `limit()` throws → fail-open, Sentry called
- **Missing config**: env vars deleted → graceful skip, no crash
- **Boundary**: verify composite key format is deterministic

## Must-Haves

- [ ] All 6 test cases pass
- [ ] Mock pattern uses class-based mock (not vi.fn() — Ratelimit is instantiated with `new`)
- [ ] No real Redis connection attempted
- [ ] Sentry captureException verified on failure path
- [ ] Console.warn verified on missing env vars

## Verification

- `npx vitest run tests/unit/rate-limit.test.ts` exits 0 with all tests passing
- `npm run build` still passes (no type errors introduced)
  - Estimate: 25m
  - Files: tests/unit/rate-limit.test.ts
  - Verify: npx vitest run tests/unit/rate-limit.test.ts && npm run build
