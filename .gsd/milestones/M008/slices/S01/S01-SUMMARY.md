---
id: S01
parent: M008
milestone: M008
provides:
  - TeacherCard component reusable in S03 category pages
  - DirectoryFilters reusable or forkable in S03
  - SUBJECT_LIST and GRADE_LEVELS constants reusable in S02 tsvector migration and S03 category slugs
requires:
  []
affects:
  - S02 (full-text search wires into the same /tutors page query)
  - S03 (category pages reuse TeacherCard and directory query pattern)
key_files:
  - src/lib/constants/directory.ts
  - src/components/directory/TeacherCard.tsx
  - src/components/directory/DirectoryFilters.tsx
  - src/app/tutors/page.tsx
key_decisions:
  - TeacherCard is purely presentational — no server logic, easy to reuse in category pages (S03)
  - DirectoryFilters uses URL params + router.push for shareable/bookmarkable filtered views
  - CityInput is an uncontrolled sub-component with useRef debounce to avoid hook-in-callback anti-pattern
  - Page fails open on Supabase query error (safe-default-on-error from KNOWLEDGE.md)
  - Canonical URL hardcoded to production URL per KNOWLEDGE.md og:url pattern
  - PRICE_RANGES.find() decodes URL key back to min/max for query (no DB column for price key)
patterns_established:
  - Directory filter components use URL params + router.push (shareable/bookmarkable filters — same pattern to use for category pages in S03)
  - PRICE_RANGES constant encodes label, min, max together — a string key is derived for URL params and decoded server-side
observability_surfaces:
  - console.error log at /tutors on Supabase query failure with error.message context
drill_down_paths:
  - milestones/M008/slices/S01/tasks/T01-SUMMARY.md
  - milestones/M008/slices/S01/tasks/T02-SUMMARY.md
  - milestones/M008/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:25:36.014Z
blocker_discovered: false
---

# S01: Directory Page & Filters

**Public /tutors directory built \u2014 filtered teacher card grid, URL-param-driven, SEO-friendly, build passes.**

## What Happened

Built the /tutors public directory from scratch. Three tasks: (1) TeacherCard component with avatar, verified badge, subject pills with overflow, location, and hourly rate; (2) DirectoryFilters client component with subject/grade/price selects and debounced city input, updating URL params on change; (3) /tutors server page that reads searchParams, builds a filtered Supabase query, and renders results in a responsive 3-column grid. Also fixed a pre-existing npm install gap (qrcode/qrcode.react not installed) that was blocking builds. Build passes with /tutors in the route manifest.

## Verification

npm run build passes with /tutors in route manifest. tsc --noEmit shows only pre-existing qrcode errors. TeacherCard, DirectoryFilters, and /tutors page all compile clean.

## Requirements Advanced

- DIR-01 — Implemented /tutors page with is_published=true filter, teacher cards, and link to /[slug]
- DIR-02 — Implemented subject, grade level, city, and price range filters via URL search params

## Requirements Validated

- DIR-01 — /tutors in route manifest, npm run build passes, renders published teachers with cards linking to /[slug], meta tags set
- DIR-02 — Subject (.contains), grade (.contains), city (.ilike), price (.lte/.gte) filter params wired to URL search params and Supabase query

## New Requirements Surfaced

- Pagination needed at scale — current 50-result hard limit is fine for MVP but a follow-up for M009+

## Requirements Invalidated or Re-scoped

None.

## Deviations

npm install was required to fix pre-existing missing qrcode/qrcode.react packages before build could pass. No plan deviations otherwise.

## Known Limitations

No pagination yet \u2014 hard limit of 50 results. Sufficient for MVP but will need cursor-based pagination when directory grows.

## Follow-ups

None.

## Files Created/Modified

- `src/lib/constants/directory.ts` — Directory constants: SUBJECT_LIST (19 subjects), GRADE_LEVELS (14 levels), PRICE_RANGES (5 tiers)
- `src/components/directory/TeacherCard.tsx` — TeacherCard presentational component: photo/avatar, verified badge, subject pills (max 3 + overflow), location, hourly rate
- `src/components/directory/DirectoryFilters.tsx` — DirectoryFilters client component: subject/grade/price selects, debounced city input, active filter chips, clear-all button
- `src/app/tutors/page.tsx` — /tutors page: async server component with Supabase query, filter integration, responsive card grid, meta tags, Suspense boundary
