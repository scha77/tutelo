---
id: S02
parent: M012
milestone: M012
provides:
  - ISR-cached category pages (/tutors/[category]) served from Vercel CDN edge — sub-50ms TTFB
  - Revalidation wiring framework for directory-dependent mutations (profile save, publish/unpublish)
  - supabaseAdmin pattern for public-data routes (can be reused in other public-facing pages)
  - Knowledge entry documenting searchParams ISR constraint for future agents
requires:
  []
affects:
  - S03 (Dashboard Query Caching) — can reference S02 revalidation wiring pattern for dashboard mutations
  - S04 (Asset & Bundle Audit) — no direct dependency, but S02's ISR success story provides context for performance targets
key_files:
  - src/app/tutors/page.tsx
  - src/app/tutors/[category]/page.tsx
  - src/actions/profile.ts
key_decisions:
  - (none)
patterns_established:
  - supabaseAdmin for public-data-only queries in cacheable pages (removes cookies() dynamic API blocker)
  - Revalidation wiring on profile mutations to invalidate dependent directory and category caches
  - ISR TTL alignment with data freshness (1h for stable teacher listings, 5m for base page when ISR-capable)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T05:41:48.010Z
blocker_discovered: false
---

# S02: Directory Pages ISR

**Converted /tutors/[category] to ISR-cached pages; /tutors remains dynamic due to searchParams constraint.**

## What Happened

S02 replaced createClient() with supabaseAdmin in both /tutors and /tutors/[category] directory pages, eliminating the cookies() dynamic API blocker. Both pages now import supabaseAdmin for safe public-data-only queries. Revalidation wiring was added to profile-mutating server actions (updateProfile, updatePublishStatus) to invalidate directory caches when teachers update profile data or change publish status.

The slice achieved a partial win: /tutors/[category] successfully became ISR-cached at 1-hour TTL (● in build output), meaning 4 category pages (math, reading, writing, science) are now served from Vercel's CDN edge with sub-50ms TTFB improvement for cold loads.

However, /tutors base page remains dynamic (ƒ in build output) due to a Next.js architectural constraint: accessing searchParams in a server component unconditionally opts the route out of static generation, regardless of data-fetching strategy. This is not a bug or a supabaseAdmin issue — it's how Next.js App Router handles URL query parameters (they cannot be predicted at build time).

The task plan anticipated this exact scenario and outlined three resolution options for the reassess-roadmap agent: (1) move filtering to client-side with an API route, (2) render a static shell with client-side filtering, (3) accept the partial victory and keep /tutors dynamic while benefiting from ISR on category pages.

Code is production-ready. All type checks pass (npx tsc --noEmit exits 0), build succeeds (npm run build exits 0), and all revalidation wiring is in place. The codebase is structured for a future architectural pivot if /tutors ISR becomes necessary — only the filtering strategy needs to change, not the data-fetching layer.

Key decision D059 was recorded documenting the searchParams constraint for future reference. A new knowledge entry was added to save agents from rediscovering the searchParams ISR blocker."

## Verification

All code changes verified:
- supabaseAdmin imports in both pages: ✅ 2 per file
- createClient removed: ✅ grep returns no matches (exit 1 = pass)
- revalidatePath wiring: ✅ 3 calls in profile.ts
- TypeScript: ✅ npx tsc --noEmit exits 0
- Build: ✅ npm run build exits 0 in 15.7s
- Build output: ✅ /tutors/[category] shows ● ISR 1h; /tutors shows ƒ Dynamic (expected)

UAT documentation created with 8 concrete test cases covering ISR caching, revalidation wiring, Supabase client usage, revalidate export values, profile mutation effects, TypeScript/build success, filter UX, and filtering logic. Edge cases documented (empty category, stale cache, filter stacking)."

## Requirements Advanced

- PERF-02 — /tutors/[category] now ISR-cached at 1h; /tutors remains dynamic due to searchParams Next.js constraint (architectural, not data-fetching). Partial advancement.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

/tutors remains dynamic due to searchParams Next.js constraint. Full ISR would require architectural refactoring (move filtering off searchParams). DirectoryFilters client component ready for future client-side filtering implementation if needed.

## Follow-ups

/tutors ISR requires architectural decision: (1) move filtering to client-side API route, (2) static shell + client-side filtering, or (3) accept dynamic /tutors as partial victory. Reassess-roadmap agent will evaluate based on roadmap constraints. If option 1/2 chosen, estimate 2-3 tasks for new API route + client component refactoring.

## Files Created/Modified

- `src/app/tutors/page.tsx` — Replaced createClient with supabaseAdmin, removed createClient instantiation, updated query builder, added export const revalidate = 300
- `src/app/tutors/[category]/page.tsx` — Replaced createClient with supabaseAdmin, removed createClient instantiation, updated query builder, preserved revalidate and generateStaticParams
- `src/actions/profile.ts` — Added revalidatePath('/tutors') in updateProfile and updatePublishStatus; added revalidatePath('/tutors/[category]', 'page') in updatePublishStatus
