---
id: T01
parent: S01
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/components/directory/TeacherCard.tsx", "src/lib/constants/directory.ts"]
key_decisions: ["Constants (SUBJECT_LIST, GRADE_LEVELS, PRICE_RANGES) extracted to src/lib/constants/directory.ts rather than inside the filter component — needed by both server query (T03) and client filter (T02)"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit — only pre-existing qrcode module errors, no new errors from TeacherCard or constants files."
completed_at: 2026-03-31T02:21:43.950Z
blocker_discovered: false
---

# T01: TeacherCard component built with photo/avatar, verified badge, subject pills, location, and hourly rate.

> TeacherCard component built with photo/avatar, verified badge, subject pills, location, and hourly rate.

## What Happened
---
id: T01
parent: S01
milestone: M008
key_files:
  - src/components/directory/TeacherCard.tsx
  - src/lib/constants/directory.ts
key_decisions:
  - Constants (SUBJECT_LIST, GRADE_LEVELS, PRICE_RANGES) extracted to src/lib/constants/directory.ts rather than inside the filter component — needed by both server query (T03) and client filter (T02)
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:21:43.951Z
blocker_discovered: false
---

# T01: TeacherCard component built with photo/avatar, verified badge, subject pills, location, and hourly rate.

**TeacherCard component built with photo/avatar, verified badge, subject pills, location, and hourly rate.**

## What Happened

Created src/components/directory/TeacherCard.tsx as a pure presentational component. Renders teacher photo (Avatar with initials fallback), name with BadgeCheck icon if verified_at is set, school name, headline (line-clamp-2), subject pills (max 3 + overflow count badge), and footer row with location + hourly rate. Link wraps the entire card to /{slug}. Also created src/lib/constants/directory.ts with SUBJECT_LIST, GRADE_LEVELS, and PRICE_RANGES constants shared between filters and server query.

## Verification

npx tsc --noEmit — only pre-existing qrcode module errors, no new errors from TeacherCard or constants files.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 1 | ✅ pass — only pre-existing qrcode errors, zero new errors | 8000ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/directory/TeacherCard.tsx`
- `src/lib/constants/directory.ts`


## Deviations
None.

## Known Issues
None.
