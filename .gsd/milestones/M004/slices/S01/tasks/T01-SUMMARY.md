---
id: T01
parent: S01
milestone: M004
provides:
  - generate5MinOptions() — 288 HH:MM strings for 5-min granularity dropdowns
  - formatTimeLabel() — 24h to 12h display formatter
  - validateNoOverlap() — time window overlap/validity checker with descriptive errors
key_files:
  - src/lib/utils/time.ts
  - tests/unit/time-utils.test.ts
key_decisions:
  - Lexicographic string comparison for HH:MM time ordering (no Date parsing needed)
  - validateNoOverlap sorts a copy internally so callers don't need to pre-sort
  - Adjacent (touching) windows are valid; only strict overlaps are rejected
patterns_established:
  - Pure utility functions in src/lib/utils/ with comprehensive Vitest unit tests in tests/unit/
  - ValidationResult type pattern: { valid: boolean, error?: string } for structured error reporting
observability_surfaces:
  - validateNoOverlap returns descriptive error strings identifying which windows overlap
  - Run `npx vitest run tests/unit/time-utils.test.ts` to verify correctness (25 tests)
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Create time utilities and unit tests

**Created `src/lib/utils/time.ts` with `generate5MinOptions`, `formatTimeLabel`, and `validateNoOverlap` — all 25 unit tests passing.**

## What Happened

Built the pure-function utility module consumed by the availability editor (T03) and future override editor (S02). Three functions exported:

1. `generate5MinOptions()` — generates 288 zero-padded `HH:MM` strings from `00:00` to `23:55` using `Array.from` with index-based math.
2. `formatTimeLabel(hhmm)` — converts 24-hour `HH:MM` to 12-hour `h:MM AM/PM` for dropdown display labels.
3. `validateNoOverlap(windows)` — validates an array of `{start_time, end_time}` objects: rejects `end_time <= start_time`, sorts a copy by `start_time`, detects overlapping ranges. Returns `{valid: true}` or `{valid: false, error: "descriptive message"}`.

## Verification

- `npx vitest run tests/unit/time-utils.test.ts` — **25/25 tests pass** (generate5MinOptions: 7, formatTimeLabel: 7, validateNoOverlap: 11)
- `npx tsc --noEmit` — no type errors
- `npm run build` — zero errors (slice-level check, passes)

## Diagnostics

- Run `npx vitest run tests/unit/time-utils.test.ts` to verify correctness
- `validateNoOverlap` error strings identify the specific overlapping windows (e.g., "Overlap detected: window 08:00–10:00 overlaps with 09:00–11:00")

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/utils/time.ts` — new: pure utility module with generate5MinOptions, formatTimeLabel, validateNoOverlap
- `tests/unit/time-utils.test.ts` — new: 25 Vitest unit tests covering all edge cases
