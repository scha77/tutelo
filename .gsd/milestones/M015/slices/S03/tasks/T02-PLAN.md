---
estimated_steps: 36
estimated_files: 1
skills_used: []
---

# T02: Unit tests for checkLimit with mocked Upstash

## Description

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

## Inputs

- ``src/lib/rate-limit.ts` — the module under test (created in T01)`

## Expected Output

- ``tests/unit/rate-limit.test.ts` — unit test file for checkLimit`

## Verification

npx vitest run tests/unit/rate-limit.test.ts && npm run build
