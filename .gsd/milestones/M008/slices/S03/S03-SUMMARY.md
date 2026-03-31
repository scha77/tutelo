---
id: S03
parent: M008
milestone: M008
provides:
  - SEO category pages indexed by Google at /tutors/[subject] and /tutors/[city]
  - Sitemap enabling Google to discover all teacher profile URLs automatically
requires:
  - slice: S01
    provides: TeacherCard component, SUBJECT_LIST constant
affects:
  - S04 has no dependency on S03 — can proceed immediately
key_files:
  - src/app/tutors/[category]/page.tsx
  - src/app/sitemap.ts
key_decisions:
  - Location slugs (/tutors/chicago) resolved dynamically at runtime — no need to enumerate all cities
  - revalidate=3600 on category pages — acceptable staleness for SEO (pages refresh within 1 hour)
  - Sitemap uses SSR (no revalidate) so it always reflects current published state
  - Canonical tags on category pages point to the category page itself (not /tutors) to avoid duplicate-content penalty
patterns_established:
  - resolveCategory() slug dispatch pattern: known SUBJECT_LIST slug → subject filter, unknown slug → city filter. Extensible to other category types (state, grade level) without code changes.
observability_surfaces:
  - console.error on category page query failure with category + error.message context
drill_down_paths:
  - milestones/M008/slices/S03/tasks/T01-SUMMARY.md
  - milestones/M008/slices/S03/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:31:53.808Z
blocker_discovered: false
---

# S03: Category Pages & Sitemap

**SEO category pages and sitemap shipped. /tutors/[category] and /sitemap.xml both in route manifest. Build passes.**

## What Happened

Two tasks: (1) category page /tutors/[category] with subject/location resolution, ISR, unique meta, and TeacherCard grid; (2) sitemap.ts covering the full URL space. Both build clean. /sitemap.xml and /tutors/[category] appear in the Next.js route manifest.

## Verification

npx tsc --noEmit clean. npm run build passes with /tutors/[category] and /sitemap.xml in route manifest.

## Requirements Advanced

- SEO-04 — /tutors/[category] dynamic route with ISR and unique meta/canonical per category
- SEO-03 — /sitemap.xml lists all published teacher /[slug] URLs + /tutors + 19 category pages

## Requirements Validated

- SEO-03 — /sitemap.xml in Next.js route manifest (npm run build). Covers all published teacher slugs + /tutors + 19 subject category pages. teacher updated_at used as lastModified.
- SEO-04 — /tutors/[category] in Next.js route manifest. generateStaticParams covers SUBJECT_LIST. generateMetadata emits unique title/description/canonical per category. revalidate=3600 for ISR.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

Category pages only have back-link to /tutors, no inline filter controls. Users need to go back to /tutors to filter further. Acceptable for MVP \u2014 category pages are SEO landing pages, not interactive filter surfaces.

## Follow-ups

None.

## Files Created/Modified

- `src/app/tutors/[category]/page.tsx` — Category pages at /tutors/[category] — subject and location slugs, ISR revalidate=3600, unique meta/canonical, TeacherCard grid, back link to /tutors
- `src/app/sitemap.ts` — XML sitemap: /tutors + 19 subject category pages + all published teacher profile pages
