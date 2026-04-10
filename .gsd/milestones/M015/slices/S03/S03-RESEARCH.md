# S03 Research — Rate Limiting Primitive

## Summary

An in-memory rate limiter already exists at `src/lib/utils/rate-limit.ts` and is wired into `/api/waitlist` and `/api/track-view`. It's per-serverless-instance (a `Map` in module scope), meaning each Vercel cold start gets a fresh counter — ineffective against coordinated abuse. The roadmap specifies upgrading to a distributed store with a `checkLimit(ip, 'endpoint-key', { max: 10, window: '1m' })` API shape exported from `src/lib/rate-limit.ts` (note: moved up from `utils/` subdirectory).

No Redis, Upstash, or KV packages are currently installed. No `UPSTASH_*` env vars exist.

## Requirement Coverage

No active requirements map directly to this slice — it's operational hardening. R134 (message notification rate limiting) is already validated via email cooldown logic, which is unrelated to IP-based abuse protection.

## Recommendation

Use `@upstash/ratelimit` + `@upstash/redis` with the sliding window algorithm. This is the standard Vercel-ecosystem solution for serverless rate limiting.

**Why Upstash over alternatives:**
- Roadmap explicitly says "distributed store" — in-memory enhancement would contradict the spec.
- Upstash Redis free tier: 10,000 commands/day, 256MB storage. For rate limiting, each `checkLimit` call costs ~2 Redis commands. At MVP traffic, this is more than sufficient.
- `@upstash/ratelimit` handles the algorithm (sliding window), TTL management, and atomic operations. No need to hand-roll Lua scripts or multi-key coordination.
- HTTP-based (not TCP), designed for serverless/edge — no connection pool management.

**Why sliding window over fixed window:**
- Fixed window has burst vulnerability at window boundaries (e.g., 10 requests at 0:59 + 10 at 1:01 = 20 in 2 seconds against a 10/min limit).
- Sliding window approximation smooths this out with negligible extra cost (2 Redis keys vs 1).

## Implementation Landscape

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/rate-limit.ts` | **Create** (new path) | Distributed rate limiter wrapping `@upstash/ratelimit`. Exports `checkLimit()`. |
| `src/lib/utils/rate-limit.ts` | **Delete** | Replaced by `src/lib/rate-limit.ts`. |
| `src/app/api/waitlist/route.ts` | **Update import** | Change import from `@/lib/utils/rate-limit` to `@/lib/rate-limit`. |
| `src/app/api/track-view/route.ts` | **Update import** | Same import path change. |
| `tests/unit/rate-limit.test.ts` | **Create** | Unit tests for `checkLimit` with mocked Redis. |

### API Contract

The roadmap specifies:
```ts
checkLimit(ip: string, endpointKey: string, opts: { max: number; window: string }): Promise<{ allowed: boolean }>
```

Internally, this should construct a composite key (`${endpointKey}:${ip}`), call `ratelimit.limit(compositeKey)`, and return `{ allowed: success, remaining, reset }`.

The `window` param uses Upstash's duration string format: `'1m'`, `'10s'`, `'1h'`.

### Architecture Decision: Single vs Per-Endpoint Ratelimit Instances

**Two viable patterns:**

1. **Single instance with composite keys** — One `Ratelimit` instance (e.g., 10 req/min), callers pass endpoint-specific keys. Simple but all endpoints share the same limit configuration.

2. **Factory pattern returning per-config instances** — `checkLimit` creates/caches `Ratelimit` instances per `{max, window}` tuple. Each endpoint can have different limits. Slight overhead from cache lookup.

**Recommendation: Factory pattern.** S04 needs different limits per endpoint (waitlist: 5/min, track-view: 10/min, verify-email: 3/min, login: 5/min). A factory avoids creating multiple top-level instances and keeps the API clean. Use a `Map<string, Ratelimit>` keyed by `${max}:${window}` to cache instances.

### Graceful Degradation

If Upstash Redis is unreachable (env vars missing, service down), `checkLimit` should **allow the request** (fail open). This matches the project's "Safe-Default-on-Error" knowledge entry. Log the error, but never block users because the rate limiter's infrastructure failed.

Implementation: wrap the `ratelimit.limit()` call in a try/catch; on error, log with Sentry, return `{ allowed: true }`.

### Environment Variables Required

```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```

These come from the Upstash Console after creating a Redis database. `Redis.fromEnv()` reads them automatically.

### Dependencies to Install

```
npm install @upstash/redis @upstash/ratelimit
```

- `@upstash/redis@1.37.0` — HTTP-based Redis client
- `@upstash/ratelimit@2.0.8` — Rate limiting algorithms

### Testing Strategy

Unit tests should mock `@upstash/ratelimit` — no real Redis needed. Test cases:
1. First request allowed (under limit)
2. Request blocked (over limit)
3. Different endpoint keys are independent
4. Redis failure falls back to allow (fail-open)
5. Missing env vars → warn + allow

The mock pattern: `vi.mock('@upstash/ratelimit', ...)` with a class mock (same pattern as Resend mock — `@upstash/ratelimit` exports a class instantiated with `new`).

### Migration Path for Existing Callers

The current `rateLimit(key, { maxRequests, windowMs })` returns `boolean`. The new `checkLimit(ip, endpointKey, { max, window })` returns `Promise<{ allowed: boolean }>`. S04 will update the callers — S03 just needs to:
1. Create the new module at `src/lib/rate-limit.ts`
2. Keep the old `src/lib/utils/rate-limit.ts` intact (S04 handles the migration)
3. No existing callers change in S03

### Natural Task Decomposition

1. **T01: Install packages + create `src/lib/rate-limit.ts`** — Install `@upstash/redis` and `@upstash/ratelimit`. Implement `checkLimit()` with factory pattern, fail-open error handling, and env var validation. This is the core deliverable.

2. **T02: Unit tests** — Test `checkLimit` with mocked Upstash. Cover: allowed, blocked, independent keys, fail-open on Redis error, missing env vars.

3. **T03: Env var documentation + verification** — Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`. Verify build passes with `npm run build`. Verify tests pass.

T01 is the riskiest (new dependency, new module). T02 validates T01. T03 is housekeeping.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Upstash free tier exhaustion | 10K commands/day ÷ 2 commands/check = 5K rate-limit checks/day. At MVP traffic this is ample. Monitor via Upstash console. |
| Redis latency adds to endpoint response time | Upstash HTTP latency is ~1-5ms from US regions. Negligible vs. Supabase/Stripe calls. |
| Missing env vars in test/CI | Fail-open design means tests without env vars still pass (rate limiting is skipped). Unit tests mock the dependency. |
| S04 migration friction | S03 preserves the old module untouched. S04 does the import swap. No breakage. |

## Don't Hand-Roll

- **Don't implement sliding window manually** with raw Redis MULTI/EXEC or Lua scripts. `@upstash/ratelimit` handles this correctly with tested algorithms.
- **Don't use `Map<string, number[]>` with timestamps** for an in-memory sliding window "upgrade." It's still per-instance and doesn't solve the distributed problem.
- **Don't use Vercel KV** — it's a rebranded Upstash Redis with identical API but higher pricing and an extra abstraction layer. Go direct to Upstash.

## Skills Discovered

No new skills installed. The `upstash/redis-js@redis-js` skill (249 installs) exists but is unnecessary — the `@upstash/ratelimit` library docs from Context7 provide sufficient API reference, and the integration is straightforward (2 packages, ~30 lines of code).
