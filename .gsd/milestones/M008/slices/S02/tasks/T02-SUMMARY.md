---
id: T02
parent: S02
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/components/directory/DirectoryFilters.tsx", "src/app/tutors/page.tsx"]
key_decisions: ["SearchInput uses the same uncontrolled + useRef debounce pattern as CityInput for consistency", "q param shown as chip with quotes ("SAT prep") to distinguish it visually from structured filter chips", "textSearch type: 'websearch' allows natural language queries like 'SAT prep' or 'math AND science'"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit clean (no new errors). npm run build passes with /tutors in route manifest."
completed_at: 2026-03-31T02:28:22.272Z
blocker_discovered: false
---

# T02: Search input wired into /tutors with combined textSearch query. Build passes.

> Search input wired into /tutors with combined textSearch query. Build passes.

## What Happened
---
id: T02
parent: S02
milestone: M008
key_files:
  - src/components/directory/DirectoryFilters.tsx
  - src/app/tutors/page.tsx
key_decisions:
  - SearchInput uses the same uncontrolled + useRef debounce pattern as CityInput for consistency
  - q param shown as chip with quotes ("SAT prep") to distinguish it visually from structured filter chips
  - textSearch type: 'websearch' allows natural language queries like 'SAT prep' or 'math AND science'
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:28:22.273Z
blocker_discovered: false
---

# T02: Search input wired into /tutors with combined textSearch query. Build passes.

**Search input wired into /tutors with combined textSearch query. Build passes.**

## What Happened

Added SearchInput component to DirectoryFilters (before the Subject select, debounced 300ms). Added q to the searchParams type and destructuring in the /tutors page. Combined textSearch('search_vector', q, {type: 'websearch'}) wired into the query chain. Active chip for q shows with quotes. filterLabels includes the search term first. tsc and build both clean.

## Verification

npx tsc --noEmit clean (no new errors). npm run build passes with /tutors in route manifest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build 2>&1 | grep '/tutors'` | 0 | ✅ pass — /tutors in route manifest | 12000ms |


## Deviations

None.

## Known Issues

None. The textSearch call will only return results once migration 0012 is applied in production \u2014 before the migration, search_vector is NULL and textSearch returns no matches.

## Files Created/Modified

- `src/components/directory/DirectoryFilters.tsx`
- `src/app/tutors/page.tsx`


## Deviations
None.

## Known Issues
None. The textSearch call will only return results once migration 0012 is applied in production \u2014 before the migration, search_vector is NULL and textSearch returns no matches.
