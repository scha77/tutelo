# S03: Rate Limiting Primitive — UAT

**Milestone:** M015
**Written:** 2026-04-10T04:58:08.678Z

## UAT: Rate Limiting Primitive

### Preconditions
- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- No UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars required for tests (fully mocked)

### Test 1: Module exports and type safety
1. Run `npm run build`
2. **Expected:** Build succeeds with exit code 0, no TypeScript errors related to rate-limit.ts

### Test 2: Unit test suite passes
1. Run `npx vitest run tests/unit/rate-limit.test.ts`
2. **Expected:** 6/6 tests pass:
   - allows requests under the limit
   - blocks requests over the limit
   - uses composite key (endpointKey:ip)
   - independent endpoint keys
   - fails open on Redis error (Sentry called)
   - fails open when env vars missing (console.warn, no Sentry)

### Test 3: checkLimit API contract
1. Open `src/lib/rate-limit.ts`
2. **Expected:** `checkLimit` exported with signature `(ip: string, endpointKey: string, opts: { max: number; window: Duration }) => Promise<CheckLimitResult>`
3. **Expected:** `CheckLimitResult` has `{ allowed: boolean; remaining?: number; reset?: number }`

### Test 4: Factory caching
1. Open `src/lib/rate-limit.ts`
2. **Expected:** Module-level `Map<string, Ratelimit>` keyed by `${max}:${window}`
3. **Expected:** `getOrCreateLimiter` checks Map before creating new instance

### Test 5: Fail-open on missing env vars
1. Delete UPSTASH_REDIS_REST_URL from environment
2. Call `checkLimit('1.2.3.4', 'test', { max: 10, window: '1 m' })`
3. **Expected:** Returns `{ allowed: true }`, console.warn emitted, no Sentry exception

### Test 6: Fail-open on Redis error
1. With env vars set, simulate Redis throwing an error
2. **Expected:** Returns `{ allowed: true }`, Sentry.captureException called with the error

### Test 7: Old rate limiter untouched
1. Run `git diff src/lib/utils/rate-limit.ts`
2. **Expected:** No changes — old in-memory rate limiter preserved for S04 migration

### Test 8: Env var documentation
1. Open `.env.example`
2. **Expected:** Contains entries for `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Edge Cases
- Composite key format is deterministic: `${endpointKey}:${ip}` (verified by test 3 in unit suite)
- Two endpoints with same IP but different endpoint keys get independent rate limits (verified by test 4 in unit suite)
- Duration type uses Upstash template literal format (e.g., '1 m', '10 s', '1 h') — not plain milliseconds
