---
id: S01
parent: M012
milestone: M012
provides:
  - ISR pattern for public pages using supabaseAdmin
  - Draft mode API endpoint for preview flows
  - Slug-specific on-demand revalidation pattern for server actions
  - Suspense-wrapped client components on ISR routes pattern
requires:
  []
affects:
  - M012/S02
key_files:
  - src/app/[slug]/ViewTracker.tsx
  - src/app/api/draft/[slug]/route.ts
  - src/app/[slug]/page.tsx
  - src/components/onboarding/WizardStep3.tsx
  - src/actions/profile.ts
  - src/actions/bookings.ts
  - src/actions/availability.ts
key_decisions:
  - createClient() blocks ISR — use supabaseAdmin for all ISR page data fetching (D057)
  - draftMode() does NOT block ISR in Next.js 16 — safe alongside generateStaticParams (D056)
  - Draft mode shared secret is client-visible but acceptable — unpublished pages already gated
  - Slug-specific revalidatePath with broad fallback — scales within Vercel ISR write limit
  - BookingCalendar wrapped in <Suspense> — required for ISR prerender when component uses useSearchParams()
patterns_established:
  - ISR public pages must use supabaseAdmin (not createClient) for all data fetching
  - Client components using useSearchParams() on ISR pages must be wrapped in <Suspense>
  - Draft mode API endpoint pattern: /api/draft/[slug]?token=SECRET validates, enables draftMode, redirects
  - Slug-specific revalidatePath: query slug post-mutation, call revalidatePath(`/${slug}`), fall back to broad pattern
  - Fire-and-forget tracking client component: useEffect with empty dep array, catch-suppressed fetch, returns null
observability_surfaces:
  - x-vercel-cache response header on /[slug] requests: HIT/MISS/STALE
  - npm run build output: ● /[slug] with Revalidate: 1h confirms ISR active
  - /api/draft/[slug]?token=invalid returns 401 JSON — validates token check working
  - ViewTracker POST to /api/track-view visible in Network DevTools
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T04:12:32.428Z
blocker_discovered: false
---

# S01: Profile Page ISR + On-Demand Revalidation

**Converted /[slug] profile page from dynamic SSR to ISR, wired on-demand revalidation to all profile-mutating server actions, and created the ViewTracker + draft mode prerequisites.**

## What Happened

Three tasks delivered the full ISR capability for the public teacher profile page.

T01 created two prerequisite files that unblocked ISR: ViewTracker.tsx (a use client component that fires a fire-and-forget POST to /api/track-view after hydration, replacing the server-side headers() call that was blocking ISR) and /api/draft/[slug]/route.ts (a GET endpoint that validates DRAFT_MODE_SECRET and enables Next.js draft mode, replacing the ?preview=true searchParams pattern). WizardStep3 preview URL was updated to use the new draft endpoint.

T02 performed the core ISR conversion of src/app/[slug]/page.tsx: removed the blocking createClient() and headers() imports, switched all data fetching to supabaseAdmin, added export const revalidate = 3600 and generateStaticParams() (queries published slugs via supabaseAdmin at build time), replaced searchParams preview check with draftMode(), wrapped BookingCalendar in <Suspense> (required because it calls useSearchParams()), and wired ViewTracker for client-side page view tracking. The build now shows ● /[slug] with Revalidate: 1h and Expire: 1y — four published profiles pre-rendered at build time.

T03 tightened revalidatePath calls across all three profile-mutating server actions: profile.ts (updateProfile, updatePublishStatus), bookings.ts (submitBookingRequest), and availability.ts (updateAvailability, saveOverrides, deleteOverridesForDate). Each action now queries the teacher's slug after the mutation and calls revalidatePath(`/${slug}`) for precision, with revalidatePath('/[slug]', 'page') as fallback.

## Verification

All slice-level verification gates passed:
1. Build output shows ● /[slug] with Revalidate: 1h (not ƒ Dynamic)
2. generateStaticParams function exists in page.tsx
3. export const revalidate = 3600 present
4. No blocking createClient() or headers() calls remain
5. ViewTracker.tsx exists with use client directive
6. /api/draft/[slug]/route.ts exists with token validation
7. draftMode() used for preview detection
8. WizardStep3 references api/draft URL
9. npx tsc --noEmit exits 0 (no TypeScript errors)
10. grep -c teacherRow confirms slug-specific revalidation in all three action files

## Requirements Advanced

- PERF-06 — ISR uses at most 1 write per profile save. ~100 saves/day uses 100 of 1,000 daily Hobby write limit. No edge runtime added.

## Requirements Validated

- PERF-01 — Build shows ● /[slug] with Revalidate: 1h. generateStaticParams and revalidate=3600 confirmed. No dynamic APIs block ISR.
- PERF-07 — revalidatePath(`/${slug}`) wired in profile.ts, bookings.ts, availability.ts with slug-specific precision and broad fallback. ISR active so calls are no longer no-ops.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T02 and T03 executor agents did not write task summaries — work verified directly from filesystem state. All verification passed.

## Known Limitations

1. ISR write limit (1,000/day) not monitored — safe at current scale.
2. Draft mode cookie expires after one request.
3. Slug change revalidation gap — old slug remains cached until TTL.
4. NEXT_PUBLIC_DRAFT_MODE_SECRET is client-visible — acceptable for current use.

## Follow-ups

S02 (Directory ISR) can reuse supabaseAdmin and generateStaticParams patterns. S03 and S04 are independent.

## Files Created/Modified

- `src/app/[slug]/ViewTracker.tsx` — New — client-side page view tracking component
- `src/app/api/draft/[slug]/route.ts` — New — draft mode preview endpoint with token validation
- `src/app/[slug]/page.tsx` — Modified — ISR conversion: generateStaticParams, revalidate, draftMode, supabaseAdmin, ViewTracker, Suspense
- `src/components/onboarding/WizardStep3.tsx` — Modified — preview URL uses /api/draft/[slug] instead of ?preview=true
- `src/actions/profile.ts` — Modified — slug-specific revalidatePath in updateProfile and updatePublishStatus
- `src/actions/bookings.ts` — Modified — slug-specific revalidatePath in submitBookingRequest
- `src/actions/availability.ts` — Modified — slug-specific revalidatePath in all three availability mutations
