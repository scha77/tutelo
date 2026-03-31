---
id: T01
parent: S02
milestone: M008
provides: []
requires: []
affects: []
key_files: ["supabase/migrations/0012_teachers_search_vector.sql"]
key_decisions: ["Weights: full_name=A (highest), school+subjects=B, bio=C — name search most relevant, bio least", "CONCURRENTLY documented with caveat about transaction-block runners", "array_to_string(subjects, ' ') flattens the TEXT[] column into a searchable string for tsvector", "DROP TRIGGER IF EXISTS before CREATE TRIGGER for idempotency"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "File exists at supabase/migrations/0012_teachers_search_vector.sql. CREATE INDEX CONCURRENTLY present."
completed_at: 2026-03-31T02:26:33.581Z
blocker_discovered: false
---

# T01: Migration 0012: tsvector column + GIN index CONCURRENTLY + auto-update trigger on teachers table.

> Migration 0012: tsvector column + GIN index CONCURRENTLY + auto-update trigger on teachers table.

## What Happened
---
id: T01
parent: S02
milestone: M008
key_files:
  - supabase/migrations/0012_teachers_search_vector.sql
key_decisions:
  - Weights: full_name=A (highest), school+subjects=B, bio=C — name search most relevant, bio least
  - CONCURRENTLY documented with caveat about transaction-block runners
  - array_to_string(subjects, ' ') flattens the TEXT[] column into a searchable string for tsvector
  - DROP TRIGGER IF EXISTS before CREATE TRIGGER for idempotency
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:26:33.582Z
blocker_discovered: false
---

# T01: Migration 0012: tsvector column + GIN index CONCURRENTLY + auto-update trigger on teachers table.

**Migration 0012: tsvector column + GIN index CONCURRENTLY + auto-update trigger on teachers table.**

## What Happened

Created migration 0012 adding search_vector tsvector column to teachers, populating existing rows, creating a GIN index CONCURRENTLY (no table lock), and adding a BEFORE INSERT OR UPDATE trigger that keeps the column in sync whenever full_name, school, subjects, or bio changes.

## Verification

File exists at supabase/migrations/0012_teachers_search_vector.sql. CREATE INDEX CONCURRENTLY present.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep 'CONCURRENTLY' supabase/migrations/0012_teachers_search_vector.sql` | 0 | ✅ pass — CONCURRENTLY present in migration | 100ms |


## Deviations

Added DROP TRIGGER IF EXISTS before CREATE TRIGGER to make the migration idempotent on re-runs.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0012_teachers_search_vector.sql`


## Deviations
Added DROP TRIGGER IF EXISTS before CREATE TRIGGER to make the migration idempotent on re-runs.

## Known Issues
None.
