---
id: T02
parent: S01
milestone: M012
provides:
  - ISR-converted teacher profile page (src/app/[slug]/page.tsx) — ● SSG with 1h revalidation
key_files:
  - src/app/[slug]/page.tsx
key_decisions:
  - All public data fetching switched from createClient() to supabaseAdmin because createClient() calls cookies() which is a dynamic API blocking ISR
  - draftMode() from next/headers does NOT block ISR in Next.js 16 — it transparently reads the bypass cookie and only opts individual requests out of cache when draft is active
  - BookingCalendar (which uses useSearchParams()) wrapped in <Suspense> to allow prerendering of ISR pages
  - Suspense fallback left empty (no spinner) — BookingCalendar is a client component that renders fully after hydration
patterns_established:
  - Public ISR pages must use supabaseAdmin for all DB reads — never createClient() (which requires cookies context)
  - useSearchParams() client components on ISR routes must be wrapped in <Suspense> or Next.js throws at prerender time
observability_surfaces:
  - Build output shows ● /[slug] with Revalidate 1h and Expire 1y — confirms ISR is active
  - 4 published teacher slugs pre-rendered at build time (test-2, soo-sup-cha-2, ms-test-teacher-2, testing-cha-2)
  - /api/draft/[slug]?token=<valid> bypasses ISR cache for draft preview via __prerender_bypass cookie
duration: ~25 min
verification_result: passed
completed_at: 2026-04-07
blocker_discovered: false
---

# T02: Convert profile page to ISR — remove dynamic APIs, add generateStaticParams

**Converted `src/app/[slug]/page.tsx` from fully dynamic to ISR (● SSG, 1h revalidate) by removing cookies-dependent data fetching, adding generateStaticParams, wiring ViewTracker, and using draftMode for preview detection.**

## What Happened

Read the existing page to understand the two dynamic API blockers. Executed the planned import changes (removed `headers` and `isBot` imports, added `draftMode` and `ViewTracker`), added `export const revalidate = 3600`, and added `generateStaticParams` querying `supabaseAdmin` for published teacher slugs.

**First build attempt showed `/[slug]` as `ƒ (Dynamic)`** — the plan's assumption that `createClient()` was safe for ISR was wrong. `createClient()` calls `cookies()` from `next/headers`, which is itself a dynamic API. Even if no real auth cookie is read, Next.js sees the `cookies()` call and opts the entire route out of the Full Route Cache. Fixed by switching all data fetching in the page (both `getTeacherBySlug` and all secondary parallel queries) to `supabaseAdmin`, which uses the service role key directly with no cookie dependency. Removed the `createClient` import entirely.

**Second build attempt failed with `useSearchParams() should be wrapped in a suspense boundary`** — `BookingCalendar` is a client component that calls `useSearchParams()`. When Next.js tries to prerender the ISR page, it can't statically render a `useSearchParams()` caller without a Suspense boundary. Fixed by wrapping the capacity/booking ternary in `<Suspense>`.

**Third build succeeded**: `/[slug]` shows `● (SSG)` with `Revalidate: 1h`, `Expire: 1y`. Four published teacher profiles pre-rendered at build time.

`draftMode()` — kept in the page for unpublished teacher detection — does NOT block ISR in Next.js 16. It only bypasses the cache per-request when the `__prerender_bypass` cookie is active.

## Verification

All task must-haves confirmed via grep checks, TypeScript noEmit (zero errors), and a full production build showing the correct route type.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -q 'generateStaticParams' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 2 | `grep -q "export const revalidate" src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 3 | `! grep -q "import { headers }" src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 4 | `! grep -q "isBot" src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 5 | `! grep -q "searchParams" src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 6 | `grep -q 'draftMode' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 7 | `grep -q '<ViewTracker teacherId' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 8 | `test -f src/app/[slug]/ViewTracker.tsx` | 0 | ✅ pass | <1s |
| 9 | `test -f src/app/api/draft/[slug]/route.ts` | 0 | ✅ pass | <1s |
| 10 | `npx tsc --noEmit` | 0 | ✅ pass | 4.6s |
| 11 | `npm run build 2>&1 \| grep '● /\[slug\]'` | 0 | ✅ pass (shows ● with 1h revalidate) | 13.9s |

**Slice-level check** — `! grep -q "from 'next/headers'" src/app/[slug]/page.tsx` technically fails (we import `draftMode` from `next/headers`). The plan description clarifies the intent as "headers import removed (only draftMode imported)" — the functional goal is met and the route is ISR. The check's grep pattern is over-broad.

## Diagnostics

- Build output: `● /[slug]` with `Revalidate: 1h`, `Expire: 1y` — ISR confirmed
- Pre-rendered slugs visible in build output under `├ ● /[slug]` subtree
- `draftMode()` bypass: visit `/api/draft/[slug]?token=<DRAFT_MODE_SECRET>` to set bypass cookie; subsequent visits to `/${slug}` will render unpublished teachers (bypasses ISR cache)
- Post-deploy: `curl -I https://tutelo.app/<slug>` → `x-vercel-cache: HIT` on second request

## Deviations

1. **Switched ALL data fetching to `supabaseAdmin`** — the plan said "The existing `createClient()` calls in the page body are fine — at build time they fall back to anon key." This is incorrect: `createClient()` unconditionally calls `cookies()`, which is a dynamic API regardless of whether cookies are populated. Fixed by removing `createClient()` entirely from this page. All queries now go through `supabaseAdmin`.

2. **Added `<Suspense>` wrapper around BookingCalendar/AtCapacitySection** — unplanned requirement discovered during build. `BookingCalendar` uses `useSearchParams()` which requires a Suspense boundary on ISR-prerendered pages. Added `import { Suspense } from 'react'` and wrapped the ternary.

## Known Issues

- The slice-level grep check `! grep -q "from 'next/headers'" src/app/[slug]/page.tsx` will fail because `draftMode` is correctly imported from `next/headers`. The check's pattern is over-broad — the actual requirement (no `headers()` dynamic function) is fully met.
- `supabaseAdmin` uses the service role key which bypasses RLS. All queries are filtered by `teacher_id` or `slug`, so this is safe for these public read-only queries. No writes use `supabaseAdmin` in this page.

## Files Created/Modified

- `src/app/[slug]/page.tsx` — converted to ISR: removed headers/isBot/searchParams/createClient, added revalidate=3600, generateStaticParams, draftMode preview check, ViewTracker JSX, Suspense boundary, all queries migrated to supabaseAdmin
