---
id: T01
parent: S04
milestone: M015
key_files:
  - src/app/api/waitlist/route.ts
  - src/app/api/track-view/route.ts
  - src/app/api/verify-email/route.ts
  - src/actions/auth.ts
key_decisions:
  - track-view limit bumped to 30/min (from 10) — page views fire frequently during normal browsing
  - verify-email returns JSON 429 (not redirect) to distinguish abuse from legitimate clicks
  - signIn and signUp share the same 'auth' bucket at 10/min per IP
duration: 
verification_result: passed
completed_at: 2026-04-10T05:13:52.212Z
blocker_discovered: false
---

# T01: Replaced in-memory rateLimit with distributed Upstash checkLimit in waitlist, track-view, verify-email, and auth actions

**Replaced in-memory rateLimit with distributed Upstash checkLimit in waitlist, track-view, verify-email, and auth actions**

## What Happened

Swapped the old synchronous rateLimit from @/lib/utils/rate-limit with the new async checkLimit from @/lib/rate-limit in waitlist and track-view API routes. Added rate limiting (previously absent) to verify-email GET route and both signIn/signUp server actions. Auth actions use headers() from next/headers for IP extraction. Limits: waitlist 5/min, track-view 30/min, verify-email 5/min, auth 10/min.

## Verification

grep -q checkLimit confirmed in all four target files. npm run build exited 0 with no type errors — all 73 pages generated successfully.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -q 'checkLimit' src/app/api/waitlist/route.ts && grep -q 'checkLimit' src/app/api/track-view/route.ts && grep -q 'checkLimit' src/app/api/verify-email/route.ts && grep -q 'checkLimit' src/actions/auth.ts` | 0 | ✅ pass | 100ms |
| 2 | `npm run build` | 0 | ✅ pass | 48100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/waitlist/route.ts`
- `src/app/api/track-view/route.ts`
- `src/app/api/verify-email/route.ts`
- `src/actions/auth.ts`
