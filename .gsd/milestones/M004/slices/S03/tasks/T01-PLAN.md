---
estimated_steps: 5
estimated_files: 3
---

# T01: Expand availability windows into 30-min booking slots and update existing tests

**Slice:** S03 — Booking Calendar Integration
**Milestone:** M004

## Description

The core S03 change: transform `getSlotsForDate()` from returning one `TimeSlot` per availability window to returning multiple 30-min increment slots per window. Extract a `generateSlotsFromWindow()` helper that loops from `windowStart` to `windowEnd` in 30-min steps, applies past-slot filtering per increment, and produces `TimeSlot[]`. Apply to both the override and recurring paths. Switch recurring slotId from `slot.id` (DB row UUID) to `${dateStr}-${startRaw}` for consistency and uniqueness across sub-slots. Write comprehensive unit tests for the expansion logic and update existing override-precedence tests to match new output shape.

## Steps

1. Add `generateSlotsFromWindow(dateStr, startRaw, endRaw, now, teacherTimezone, visitorTimezone): TimeSlot[]` helper to `src/lib/utils/slots.ts`. Logic: parse `startRaw` to UTC Date via `toDate()`, loop while `slotStart + 30min <= windowEnd`, filter each increment against `now`, format display times with `formatInTimeZone`, produce `{ slotId: ${dateStr}-${startRaw}, startDisplay, endDisplay, startRaw, endRaw }` for each valid increment.
2. Replace the override-path `flatMap` body (current lines ~71–84) with a call to `generateSlotsFromWindow()` using the override's `start_time`/`end_time`.
3. Replace the recurring-path `flatMap` body (current lines ~92–106) with a call to `generateSlotsFromWindow()` using the recurring slot's `start_time`/`end_time`.
4. Create `tests/unit/booking-slots.test.ts` with test cases:
   - Window shorter than 30 min (e.g., 3:40–4:00) → zero slots
   - Window exactly 30 min (15:00–15:30) → one slot
   - Non-aligned boundaries (3:30–4:45) → two slots (3:30, 4:00)
   - Large window (3:00–6:00) → six slots (3:00, 3:30, 4:00, 4:30, 5:00, 5:30)
   - Multiple windows per day (two recurring slots) → slots from both windows
   - Past-slot filtering per increment (time is 15:15 → 15:00 slot filtered out, 15:30 slot kept)
   - Override path produces 30-min slots (not one per window)
5. Update `tests/unit/override-precedence.test.ts`: existing tests that assert specific slot counts and slotIds must be updated to reflect 30-min expansion. For example, the test with override `09:00–09:30` now produces exactly 1 slot (as before, since the window is exactly 30 min). The test with override `16:00–17:00` now produces 2 slots (`16:00`, `16:30`). Update `toHaveLength` and slotId assertions accordingly.

## Must-Haves

- [ ] `generateSlotsFromWindow()` helper extracted as a pure function in `slots.ts`
- [ ] 30-min increment loop: `while slotStart + 30min <= windowEnd`
- [ ] Past-slot filtering applied per 30-min increment (not per window)
- [ ] `slotId` = `${dateStr}-${startRaw}` for both recurring and override paths
- [ ] Window < 30 min → returns `[]` (no crash)
- [ ] All time arithmetic uses UTC epoch math via `toDate()`, not string manipulation
- [ ] New test file `tests/unit/booking-slots.test.ts` with ≥6 test cases
- [ ] Existing `override-precedence.test.ts` tests updated and passing

## Verification

- `npx vitest run tests/unit/booking-slots.test.ts` — all new edge case tests pass
- `npx vitest run tests/unit/override-precedence.test.ts` — all 6 existing tests pass with updated assertions
- `npx vitest run` — full test suite passes (no regressions)

## Observability Impact

- Signals added/changed: None — pure function, no runtime logging
- How a future agent inspects this: Run the booking-slots test file; each test name identifies the exact scenario
- Failure state exposed: Test failure names pinpoint which expansion edge case broke (e.g., "window shorter than 30 min produces zero slots")

## Inputs

- `src/lib/utils/slots.ts` — current `getSlotsForDate()` with one-slot-per-window behavior; `toDate` and `formatInTimeZone` already imported
- `tests/unit/override-precedence.test.ts` — existing test pattern with `vi.useFakeTimers()` and `vi.setSystemTime()`
- S03 research — specifies the exact 30-min increment algorithm, timezone math pattern, and edge case list

## Expected Output

- `src/lib/utils/slots.ts` — `generateSlotsFromWindow()` helper added; both flatMap bodies replaced; `getSlotsForDate()` returns 30-min increment slots
- `tests/unit/booking-slots.test.ts` — new file with ≥6 passing edge case tests
- `tests/unit/override-precedence.test.ts` — updated assertions reflecting 30-min expansion output
