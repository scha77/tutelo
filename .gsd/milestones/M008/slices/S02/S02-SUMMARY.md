---
id: S02
parent: M008
milestone: M008
provides:
  - search_vector column + GIN index available for any future search surface
  - q param and textSearch pattern reusable in category pages if needed
requires:
  - slice: S01
    provides: TeacherCard, DirectoryFilters (updated), /tutors page (updated), SUBJECT_LIST/GRADE_LEVELS constants
affects:
  - S03 (category pages can now combine textSearch with category filter for SEO pages)
key_files:
  - supabase/migrations/0012_teachers_search_vector.sql
  - src/components/directory/DirectoryFilters.tsx
  - src/app/tutors/page.tsx
key_decisions:
  - GIN index uses CREATE INDEX CONCURRENTLY — no table lock during production migration deploy
  - textSearch type: 'websearch' supports natural language including AND/OR operators
  - SearchInput follows the same uncontrolled + useRef debounce pattern as CityInput for consistency
patterns_established:
  - Uncontrolled debounced input pattern (useRef timer) established as the standard for text inputs that drive URL navigation — CityInput and SearchInput both follow this
observability_surfaces:
  - GIN index creation is logged to Supabase migration log on deploy
drill_down_paths:
  - milestones/M008/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M008/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:28:49.894Z
blocker_discovered: false
---

# S02: Full-Text Search

**Full-text search migration + SearchInput UI wired into /tutors directory. Build passes.**

## What Happened

Two tasks: (1) migration 0012 adds tsvector column, populates existing rows, creates GIN index CONCURRENTLY, and adds a BEFORE INSERT OR UPDATE trigger to keep the column in sync. (2) SearchInput added to DirectoryFilters with 300ms debounce, q param wired into the Supabase textSearch query on the /tutors page, active filter chip shows with quotes. Both build and tsc clean.

## Verification

tsc --noEmit clean. npm run build passes with /tutors in route manifest. Migration file exists with CONCURRENTLY index creation.

## Requirements Advanced

- DIR-03 — Migration adds tsvector + GIN index, SearchInput wired into textSearch query on /tutors

## Requirements Validated

- DIR-03 — Migration 0012 adds search_vector tsvector column + GIN index CONCURRENTLY + auto-update trigger. SearchInput on /tutors wired to textSearch('search_vector', q, {type: 'websearch'}). tsc clean, npm run build passes.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

textSearch requires migration 0012 to be applied in production. Before migration, search_vector is NULL and textSearch returns no matches. This is expected \u2014 the migration must be deployed alongside the code.

## Follow-ups

Migration must be applied to production before search returns results (search_vector is NULL pre-migration).

## Files Created/Modified

- `supabase/migrations/0012_teachers_search_vector.sql` — Migration: adds search_vector tsvector column, populates existing rows, creates GIN index CONCURRENTLY, adds auto-update trigger on full_name/school/subjects/bio changes
- `src/components/directory/DirectoryFilters.tsx` — Added SearchInput component (debounced, uncontrolled). Added q param read + chip + navigate. hasFilters now includes q.
- `src/app/tutors/page.tsx` — Added q to PageProps searchParams type. Added textSearch('search_vector', q) to query chain. q shown first in filterLabels.
