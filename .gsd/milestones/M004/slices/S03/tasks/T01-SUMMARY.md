---
id: T01
parent: S03
milestone: M004
provides:
  - generateSlotsFromWindow() pure helper for 30-min slot expansion
  - getSlotsForDate() now returns 30-min increment slots for both override and recurring paths
  - slotId consistently uses ${dateStr}-${startRaw} for both paths
key_files:
  - src/lib/utils/slots.ts
  - tests/unit/booking-slots.test.ts
  - tests/unit/override-precedence.test.ts
key_decisions:
  - Past-slot filtering uses strict greater-than (slotStartDate > now) per 30-min increment
  - slotId format is ${dateStr}-${HH:MM} using teacher-timezone-formatted start time
  - generateSlotsFromWindow reconstructs startRaw/endRaw via formatInTimeZone rather than string math
patterns_established:
  - Pure helper extraction pattern for slot generation — generateSlotsFromWindow is independently testable
  - 30-min increment loop using UTC epoch arithmetic (getTime + SLOT_DURATION_MS)
observability_surfaces:
  - Unit test names identify exact expansion edge case (e.g. "window shorter than 30 min produces zero slots")
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Expand availability windows into 30-min booking slots and update existing tests

**Extracted `generateSlotsFromWindow()` helper and updated `getSlotsForDate()` to return 30-min increment slots with per-increment past-slot filtering.**

## What Happened

Added `generateSlotsFromWindow()` as a pure exported function in `slots.ts` that takes a date string, start/end times, current time, and timezone pair, then loops from window start to end in 30-minute increments using UTC epoch math. Each increment is independently filtered against `now`. Windows shorter than 30 minutes produce an empty array.

Replaced both `flatMap` bodies in `getSlotsForDate()` (override path and recurring path) with calls to `generateSlotsFromWindow()`. The recurring path's `slotId` was switched from `slot.id` (DB row UUID) to `${dateStr}-${startRaw}` for consistency with override path and uniqueness across sub-slots.

Created `tests/unit/booking-slots.test.ts` with 9 test cases covering: window < 30 min, exactly 30 min, non-aligned boundaries, large window (6 slots), past-slot filtering per increment, all-past returns empty, slotId format, multiple recurring windows per day, and override path expansion.

Updated all 6 existing tests in `override-precedence.test.ts` to reflect expanded 30-min output: adjusted `toHaveLength` values, `slotId` assertions, and `startRaw`/`endRaw` expectations.

## Verification

- `npx vitest run tests/unit/booking-slots.test.ts` — 9/9 tests pass
- `npx vitest run tests/unit/override-precedence.test.ts` — 6/6 tests pass
- `npx vitest run` — full suite: 175 passed, 0 failed (25 test files pass, 10 skipped)

## Diagnostics

Run `npx vitest run tests/unit/booking-slots.test.ts` — each test name identifies the exact expansion scenario. If a specific edge case breaks, the test name pinpoints it.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/utils/slots.ts` — Added `generateSlotsFromWindow()` helper; replaced both flatMap bodies with calls to it; added `SLOT_DURATION_MS` constant
- `tests/unit/booking-slots.test.ts` — New file with 9 test cases for 30-min expansion logic
- `tests/unit/override-precedence.test.ts` — Updated all 6 existing tests for 30-min expansion output shape
