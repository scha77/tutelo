---
id: T03
parent: S01
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/app/tutors/page.tsx"]
key_decisions: ["Page fails open on Supabase query error (logs error, renders empty state) following the safe-default-on-error pattern from KNOWLEDGE.md", "metadata.alternates.canonical set to hardcoded production URL per KNOWLEDGE.md og:url pattern", "Suspense boundary wraps DirectoryFilters so the server shell renders immediately without blocking on client hydration", "PRICE_RANGES.find() used server-side to decode the price key from URL params back to min/max values for Supabase query"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit \u2014 only pre-existing errors. npm run build passes with /tutors in route manifest."
completed_at: 2026-03-31T02:24:59.943Z
blocker_discovered: false
---

# T03: /tutors page built with server-side Supabase query, filter integration, responsive card grid, and proper meta tags. Build passes.

> /tutors page built with server-side Supabase query, filter integration, responsive card grid, and proper meta tags. Build passes.

## What Happened
---
id: T03
parent: S01
milestone: M008
key_files:
  - src/app/tutors/page.tsx
key_decisions:
  - Page fails open on Supabase query error (logs error, renders empty state) following the safe-default-on-error pattern from KNOWLEDGE.md
  - metadata.alternates.canonical set to hardcoded production URL per KNOWLEDGE.md og:url pattern
  - Suspense boundary wraps DirectoryFilters so the server shell renders immediately without blocking on client hydration
  - PRICE_RANGES.find() used server-side to decode the price key from URL params back to min/max values for Supabase query
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:24:59.943Z
blocker_discovered: false
---

# T03: /tutors page built with server-side Supabase query, filter integration, responsive card grid, and proper meta tags. Build passes.

**/tutors page built with server-side Supabase query, filter integration, responsive card grid, and proper meta tags. Build passes.**

## What Happened

Created src/app/tutors/page.tsx as an async server component. Reads subject, grade, city, price searchParams. Builds a Supabase query with is_published=true, applies filters conditionally (.contains for array columns, .ilike for city, .lte/.gte for price range). Renders DirectoryFilters (wrapped in Suspense), a results count line with active filter labels, and a 3-column teacher card grid. Empty state handles both filtered and unfiltered cases. generateMetadata emits canonical URL. Also ran npm install to fix the pre-existing qrcode/qrcode.react missing module issue that was blocking builds.

## Verification

npx tsc --noEmit \u2014 only pre-existing errors. npm run build passes with /tutors in route manifest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass — /tutors in route manifest | 11900ms |
| 2 | `npx tsc --noEmit` | 1 | ✅ pass — only pre-existing qrcode errors | 8000ms |


## Deviations

npm install was required first \u2014 qrcode and qrcode.react packages were in package.json but not installed in node_modules (pre-existing gap, not introduced by this task). Fixed as part of getting build clean.

## Known Issues

None.

## Files Created/Modified

- `src/app/tutors/page.tsx`


## Deviations
npm install was required first \u2014 qrcode and qrcode.react packages were in package.json but not installed in node_modules (pre-existing gap, not introduced by this task). Fixed as part of getting build clean.

## Known Issues
None.
