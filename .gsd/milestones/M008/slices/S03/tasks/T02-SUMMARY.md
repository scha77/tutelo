---
id: T02
parent: S03
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/app/sitemap.ts"]
key_decisions: ["Sitemap uses SSR (no revalidate) — Google crawls sitemaps infrequently so no need for ISR caching layer", "Teacher updated_at used as lastModified for accurate freshness signals to Google", "SUBJECT_LIST mapped to category entries — 19 category pages + N teacher pages + 1 directory page in sitemap"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npm run build passes with /sitemap.xml in route manifest."
completed_at: 2026-03-31T02:31:22.933Z
blocker_discovered: false
---

# T02: /sitemap.xml built with teacher profiles + category pages + directory. Build passes.

> /sitemap.xml built with teacher profiles + category pages + directory. Build passes.

## What Happened
---
id: T02
parent: S03
milestone: M008
key_files:
  - src/app/sitemap.ts
key_decisions:
  - Sitemap uses SSR (no revalidate) — Google crawls sitemaps infrequently so no need for ISR caching layer
  - Teacher updated_at used as lastModified for accurate freshness signals to Google
  - SUBJECT_LIST mapped to category entries — 19 category pages + N teacher pages + 1 directory page in sitemap
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:31:22.933Z
blocker_discovered: false
---

# T02: /sitemap.xml built with teacher profiles + category pages + directory. Build passes.

**/sitemap.xml built with teacher profiles + category pages + directory. Build passes.**

## What Happened

Created src/app/sitemap.ts using Next.js built-in MetadataRoute.Sitemap. Queries all is_published=true teachers for their slug + updated_at. Emits /tutors (priority 0.9, daily), all 19 subject category pages (priority 0.7, daily), and all teacher profile pages (priority 0.8, weekly). /sitemap.xml appears in route manifest as a dynamic route.

## Verification

npm run build passes with /sitemap.xml in route manifest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build 2>&1 | grep sitemap` | 0 | ✅ pass — /sitemap.xml in manifest | 12000ms |


## Deviations

None. teachers table has updated_at column (confirmed from migration 0001).

## Known Issues

None.

## Files Created/Modified

- `src/app/sitemap.ts`


## Deviations
None. teachers table has updated_at column (confirmed from migration 0001).

## Known Issues
None.
