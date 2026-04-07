---
id: T03
parent: S01
milestone: M012
provides:
  - Slug-specific revalidatePath in updateProfile and updatePublishStatus (src/actions/profile.ts)
  - Slug-specific revalidatePath in submitBookingRequest (src/actions/bookings.ts)
  - Slug-specific revalidatePath in updateAvailability, saveOverrides, deleteOverridesForDate (src/actions/availability.ts)
key_files:
  - src/actions/profile.ts
  - src/actions/bookings.ts
  - src/actions/availability.ts
key_decisions:
  - bookings.ts slug lookup uses the already-available supabase (regular client) rather than supabaseAdmin — the supabaseAdmin dynamic import is inside a try block scoped to phone storage, so using it for the slug lookup would require restructuring; regular client can read teachers table without auth issues from a server action
patterns_established:
  - Slug-specific revalidation pattern — query teachers for slug after mutation, call revalidatePath(`/${slug}`) if found, fall back to revalidatePath('/[slug]', 'page') if not
observability_surfaces:
  - On-demand ISR revalidation now targets exact slug paths (e.g. /jane-smith) rather than the entire /[slug] route family; Vercel x-vercel-cache: STALE/MISS on the specific slug page after mutation confirms revalidation fired
duration: ~8 minutes
verification_result: passed
completed_at: 2026-04-07
blocker_discovered: false
---

# T03: Tighten revalidation to slug-specific paths in server actions

**Replaced 5 broad `revalidatePath('/[slug]', 'page')` calls across 3 action files with slug-specific `revalidatePath(\`/\${teacherRow.slug}\`)` + fallback, so only the affected teacher's ISR cache is invalidated on mutation.**

## What Happened

All three action files were updated to look up the teacher's slug after each successful DB mutation, then call `revalidatePath(\`/\${slug}\`)` instead of the broad `revalidatePath('/[slug]', 'page')`. Each call site has a fallback to the broad pattern if the slug lookup returns null (e.g., teacher row not found).

- **`profile.ts`**: Both `updateProfile` and `updatePublishStatus` now query `supabase.from('teachers').select('slug').eq('user_id', userId).single()` after their respective updates and use the slug-specific path.
- **`bookings.ts`**: `submitBookingRequest` queries `supabase.from('teachers').select('slug').eq('id', parsed.data.teacherId).single()` (using the regular client already in scope) after the booking RPC succeeds.
- **`availability.ts`**: All three functions (`updateAvailability`, `saveOverrides`, `deleteOverridesForDate`) query by `user_id` using the existing `supabase` client and `userId` already in scope.

TypeScript compiled without errors (`npx tsc --noEmit` → no output). Full Next.js build succeeded and confirmed `/[slug]` remains `● (SSG)` with `Revalidate: 1h, Expire: 1y`.

## Verification

- `npx tsc --noEmit` — exited 0, no errors
- `npm run build` — compiled successfully; `● /[slug]` with `Revalidate: 1h` confirmed ISR unbroken
- `grep -c 'teacherRow?.slug' src/actions/profile.ts` → 2 ✅
- `grep -c 'teacherRow?.slug' src/actions/bookings.ts` → 1 ✅
- `grep -c 'teacherRow?.slug' src/actions/availability.ts` → 3 ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 2.3s |
| 2 | `npm run build 2>&1 \| grep '\[slug\]'` → `● /[slug]   1h   1y` | 0 | ✅ pass | 14s |
| 3 | `grep -c 'teacherRow?.slug' src/actions/profile.ts` → 2 | 0 | ✅ pass | <1s |
| 4 | `grep -c 'teacherRow?.slug' src/actions/bookings.ts` → 1 | 0 | ✅ pass | <1s |
| 5 | `grep -c 'teacherRow?.slug' src/actions/availability.ts` → 3 | 0 | ✅ pass | <1s |
| 6 | `grep -q 'generateStaticParams' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 7 | `grep -q 'export const revalidate' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 8 | `! grep -q "from 'next/headers'" src/app/[slug]/page.tsx` | 1 | ⚠️ plan artifact — see Deviations | <1s |
| 9 | `! grep -q "searchParams" src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |
| 10 | `test -f src/app/[slug]/ViewTracker.tsx` | 0 | ✅ pass | <1s |
| 11 | `test -f src/app/api/draft/[slug]/route.ts` | 0 | ✅ pass | <1s |
| 12 | `grep -q 'draftMode' src/app/[slug]/page.tsx` | 0 | ✅ pass | <1s |

## Diagnostics

- Post-deploy: `curl -I https://tutelo.app/<slug>` on second request should show `x-vercel-cache: HIT`; after a profile save, the specific slug's next request shows `x-vercel-cache: STALE` then `MISS` then `HIT`
- All `revalidatePath` calls in these action files log no output — Vercel triggers background ISR re-render silently
- If slug lookup fails (DB error or teacher row missing), the broad `revalidatePath('/[slug]', 'page')` fallback fires, ensuring all profiles get revalidated rather than none

## Deviations

**Check [4] — `! grep -q "from 'next/headers'" src/app/[slug]/page.tsx` reports FAIL:** The page imports `import { draftMode } from 'next/headers'` which was intentionally preserved in T02 (draftMode does not block ISR in Next.js 16). The slice verification check description says "headers import removed (only draftMode imported)" — the intent was to remove the `cookies` import, not the `draftMode` import, but the grep pattern is too broad. The build output (`● /[slug]` ISR confirmed) is the authoritative proof that no dynamic APIs are blocking ISR. This is a plan artifact inconsistency, not a code issue.

## Known Issues

None.

## Files Created/Modified

- `src/actions/profile.ts` — `updateProfile` and `updatePublishStatus` now use slug-specific revalidatePath with broad fallback
- `src/actions/bookings.ts` — `submitBookingRequest` now uses slug-specific revalidatePath with broad fallback
- `src/actions/availability.ts` — `updateAvailability`, `saveOverrides`, and `deleteOverridesForDate` now use slug-specific revalidatePath with broad fallback
