---
id: T02
parent: S01
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/components/directory/DirectoryFilters.tsx"]
key_decisions: ["CityInput is an uncontrolled sub-component with a useRef debounce timer rather than a hook-wrapped debounce function", "Active filter chips show inline in the filter bar for immediate visual feedback on selected filters", "Price range encoded as 'min-max' key string to survive URL serialization cleanly"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit \u2014 only pre-existing qrcode errors, zero new errors."
completed_at: 2026-03-31T02:23:14.031Z
blocker_discovered: false
---

# T02: DirectoryFilters client component built with subject/grade/price selects, debounced city input, and active filter chips.

> DirectoryFilters client component built with subject/grade/price selects, debounced city input, and active filter chips.

## What Happened
---
id: T02
parent: S01
milestone: M008
key_files:
  - src/components/directory/DirectoryFilters.tsx
key_decisions:
  - CityInput is an uncontrolled sub-component with a useRef debounce timer rather than a hook-wrapped debounce function
  - Active filter chips show inline in the filter bar for immediate visual feedback on selected filters
  - Price range encoded as 'min-max' key string to survive URL serialization cleanly
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:23:14.031Z
blocker_discovered: false
---

# T02: DirectoryFilters client component built with subject/grade/price selects, debounced city input, and active filter chips.

**DirectoryFilters client component built with subject/grade/price selects, debounced city input, and active filter chips.**

## What Happened

Created DirectoryFilters as a 'use client' component with Subject, Grade Level, and Price Range Select dropdowns plus a debounced CityInput. Each filter change calls navigate() which builds new URLSearchParams and router.push()es, triggering a server-side re-render of the parent page. Active filter chips show below the controls with X buttons for removing individual filters. A 'Clear' button removes all filters at once. CityInput is a self-contained sub-component that manages its own debounce timer via useRef.

## Verification

npx tsc --noEmit \u2014 only pre-existing qrcode errors, zero new errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit 2>&1 | grep -v qrcode` | 0 | ✅ pass | 8000ms |


## Deviations

Dropped the top-level debounce helper in favor of a CityInput sub-component using useRef for the debounce timer \u2014 cleaner React pattern, avoids the anti-pattern of calling a hook-created callback inside an onChange inline.

## Known Issues

None.

## Files Created/Modified

- `src/components/directory/DirectoryFilters.tsx`


## Deviations
Dropped the top-level debounce helper in favor of a CityInput sub-component using useRef for the debounce timer \u2014 cleaner React pattern, avoids the anti-pattern of calling a hook-created callback inside an onChange inline.

## Known Issues
None.
