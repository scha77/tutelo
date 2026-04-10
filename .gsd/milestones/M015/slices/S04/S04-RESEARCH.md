# S04 Research: Wire Rate Limits to Public Endpoints

## Summary

Straightforward wiring of the S03 `checkLimit` helper to four public-facing endpoints. Two already use the old in-memory `rateLimit` (swap imports), one has no rate limiting (add it), and the login server action needs `headers()` from `next/headers` for IP extraction.

## Recommendation

Migrate in one pass — all four endpoints follow the same pattern. Replace the old in-memory limiter imports with the new distributed `checkLimit`, add rate limiting to verify-email and login, then verify with unit tests.

## Implementation Landscape

### Targets (4 endpoints)

| Endpoint | File | Current state | Suggested limits |
|----------|------|---------------|-----------------|
| `/api/waitlist` POST | `src/app/api/waitlist/route.ts` | Uses old `rateLimit('waitlist:${ip}', { maxRequests: 5, windowMs: 60_000 })` | `checkLimit(ip, 'waitlist', { max: 5, window: '1 m' })` |
| `/api/track-view` POST | `src/app/api/track-view/route.ts` | Uses old `rateLimit('track-view:${ip}', { maxRequests: 10, windowMs: 60_000 })` | `checkLimit(ip, 'track-view', { max: 30, window: '1 m' })` — bump limit since page views fire frequently on normal browsing |
| `/api/verify-email` GET | `src/app/api/verify-email/route.ts` | No rate limiting | `checkLimit(ip, 'verify-email', { max: 5, window: '1 m' })` |
| `signIn` / `signUp` actions | `src/actions/auth.ts` | No rate limiting | `checkLimit(ip, 'auth', { max: 10, window: '1 m' })` |

### Key Patterns

**API routes** — IP extracted from `request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'`. Already established in waitlist and track-view. `checkLimit` is async (returns Promise), so the call pattern changes from:
```ts
// Old (sync)
if (!rateLimit(key, opts)) return 429

// New (async)
const { allowed } = await checkLimit(ip, key, opts)
if (!allowed) return 429
```

**Server actions** — No `request` object available. Use `headers()` from `next/headers`:
```ts
import { headers } from 'next/headers'
const headersList = await headers()
const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
```
`headers()` returns a `Promise<ReadonlyHeaders>` in Next.js 16 (was sync before). The server action currently has `'use server'` at top — adding `headers()` is fully compatible.

**verify-email** — This is a GET handler (redirect flow). Rate limit check goes at the top before the token lookup. Return a 429 JSON response instead of a redirect to distinguish abuse from legitimate requests.

### Helper Module (S03 deliverable)

`src/lib/rate-limit.ts` exports:
- `checkLimit(ip, endpointKey, { max, window })` → `Promise<{ allowed, remaining?, reset? }>`
- `Duration` type (re-exported from `@upstash/ratelimit`)

Fail-open on missing env vars or Redis errors — matches project pattern.

### Old Rate Limiter

`src/lib/utils/rate-limit.ts` — in-memory, sync, per-instance. After migration, only the messages route and any future callers remain. Can be deleted or left for reference. No other callers in production code after this slice.

### Test Strategy

Unit tests for each migrated endpoint should verify:
1. Normal request succeeds (checkLimit returns allowed: true)
2. Rate-limited request returns 429 (checkLimit returns allowed: false)

Mock `checkLimit` via `vi.mock('@/lib/rate-limit')`. No need to test the rate limiter internals — those are covered by S03's test suite. Existing endpoint tests (if any) need the mock added to avoid Upstash import errors.

### Files Changed

- `src/app/api/waitlist/route.ts` — swap import, async checkLimit call
- `src/app/api/track-view/route.ts` — swap import, async checkLimit call
- `src/app/api/verify-email/route.ts` — add import, async checkLimit call at top
- `src/actions/auth.ts` — add headers() import, checkLimit call in signIn and signUp
- Tests: new or updated test files for each endpoint's rate limit behavior

### Constraints

- `checkLimit` is async — all callers must `await` it
- Server action `headers()` is async in Next.js 16 — must `await headers()`
- Existing tests that import these routes may need `vi.mock('@/lib/rate-limit')` added to prevent Upstash import failures
- The old `src/lib/utils/rate-limit.ts` should NOT be deleted yet if any non-target callers exist (none found, but leave it as a safety margin)

## Skills Discovered

None needed — this is standard wiring using established project patterns.
