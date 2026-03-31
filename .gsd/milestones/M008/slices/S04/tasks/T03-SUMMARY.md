---
id: T03
parent: S04
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/app/api/track-view/route.ts", "src/app/[slug]/page.tsx"]
key_decisions: ["Used void Promise.resolve(supabaseAdmin.from(...).insert(...)).catch(() => {}) pattern to fire-and-forget with TypeScript correctness", "Direct DB insert from RSC (server → Supabase) rather than server fetch → API route — avoids the extra network hop", "supabaseAdmin from service.ts (SUPABASE_SERVICE_SECRET_KEY) already existed — no need to create admin.ts"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit clean. npm run build passes with /api/track-view in route manifest."
completed_at: 2026-03-31T02:35:31.462Z
blocker_discovered: false
---

# T03: Track-view API route built and /[slug] page wires fire-and-forget insert with bot filtering.

> Track-view API route built and /[slug] page wires fire-and-forget insert with bot filtering.

## What Happened
---
id: T03
parent: S04
milestone: M008
key_files:
  - src/app/api/track-view/route.ts
  - src/app/[slug]/page.tsx
key_decisions:
  - Used void Promise.resolve(supabaseAdmin.from(...).insert(...)).catch(() => {}) pattern to fire-and-forget with TypeScript correctness
  - Direct DB insert from RSC (server → Supabase) rather than server fetch → API route — avoids the extra network hop
  - supabaseAdmin from service.ts (SUPABASE_SERVICE_SECRET_KEY) already existed — no need to create admin.ts
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:35:31.462Z
blocker_discovered: false
---

# T03: Track-view API route built and /[slug] page wires fire-and-forget insert with bot filtering.

**Track-view API route built and /[slug] page wires fire-and-forget insert with bot filtering.**

## What Happened

Created /api/track-view POST route with bot filtering and supabaseAdmin insert. Updated /[slug]/page.tsx to fire-and-forget the insert after the teacher query succeeds \u2014 non-blocking, errors swallowed. Used direct DB insert from RSC rather than fetching the API route. Fixed PromiseLike/Promise type issue with Promise.resolve() wrapper. tsc clean, build passes with /api/track-view in manifest.

## Verification

npx tsc --noEmit clean. npm run build passes with /api/track-view in route manifest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build 2>&1 | grep 'track-view'` | 0 | ✅ pass | 12000ms |


## Deviations

Supabase client's .then() returns PromiseLike (not full Promise), so .catch() doesn't exist on it directly. Fixed by wrapping in Promise.resolve() before .catch().

## Known Issues

None.

## Files Created/Modified

- `src/app/api/track-view/route.ts`
- `src/app/[slug]/page.tsx`


## Deviations
Supabase client's .then() returns PromiseLike (not full Promise), so .catch() doesn't exist on it directly. Fixed by wrapping in Promise.resolve() before .catch().

## Known Issues
None.
