---
estimated_steps: 5
estimated_files: 4
---

# T01: Add ShadCN Calendar component and unit tests for override precedence logic

**Slice:** S02 — Per-Date Override Availability
**Milestone:** M004

## Description

Install the ShadCN Calendar component (required for the date picker in the override editor) and create the test-first foundation for the override-wins-recurring precedence logic. Extract `getSlotsForDate` from `BookingCalendar.tsx` into a pure, testable utility in `src/lib/utils/slots.ts`, then extend it to accept an `overrides` parameter and write unit tests for the 3 core precedence cases.

## Steps

1. Run `npx shadcn@latest add calendar` to install the ShadCN Calendar component. Verify `src/components/ui/calendar.tsx` exists and `react-day-picker` is in `package.json`.
2. Create `src/lib/utils/slots.ts`. Extract the pure `getSlotsForDate` function from `BookingCalendar.tsx` into this file, preserving the existing signature and behavior for recurring slots. Add an `overrides` optional parameter (array of `{ specific_date: string, start_time: string, end_time: string }`). Implement the override-wins-recurring precedence: if any override row matches the date, return only override-derived slots; otherwise fall back to recurring slots. Use `${specific_date}-${startRaw}` as the `slotId` for override-derived slots. Export the `TimeSlot` interface from this file.
3. Create `tests/unit/override-precedence.test.ts` with tests covering: (a) no override for date → returns recurring slots for that day-of-week, (b) override exists for date → returns only override slots, ignoring recurring, (c) override with zero windows for date → returns empty array even if recurring slots exist for that day-of-week. Use the same vitest patterns as `tests/unit/time-utils.test.ts`.
4. Update `BookingCalendar.tsx` to import `getSlotsForDate` and `TimeSlot` from `src/lib/utils/slots.ts` instead of using the inline version. Remove the inline `getSlotsForDate` function and `TimeSlot` interface from `BookingCalendar.tsx`. Pass an empty `[]` for overrides in the existing call to maintain backward compatibility (no functional change yet).
5. Run `npx vitest run tests/unit/override-precedence.test.ts` and `npx vitest run tests/unit/time-utils.test.ts` to verify all tests pass. Run `npm run build` to ensure no type errors.

## Must-Haves

- [ ] ShadCN Calendar component installed at `src/components/ui/calendar.tsx`
- [ ] `getSlotsForDate` extracted to `src/lib/utils/slots.ts` with override precedence logic
- [ ] Unit tests cover: no override → recurring, override exists → only override, zero-window override → empty
- [ ] `BookingCalendar.tsx` imports from `slots.ts` — no inline `getSlotsForDate`
- [ ] Existing time-utils tests still pass (no regressions)
- [ ] `npm run build` passes

## Verification

- `ls src/components/ui/calendar.tsx` — file exists
- `npx vitest run tests/unit/override-precedence.test.ts` — all 3+ tests pass
- `npx vitest run tests/unit/time-utils.test.ts` — all 25 existing tests pass
- `npm run build` — zero errors

## Observability Impact

- Signals added/changed: None — this task adds pure utility functions and tests, no runtime behavior change
- How a future agent inspects this: Run the test files to verify precedence logic correctness
- Failure state exposed: Test failure messages clearly identify which precedence case is broken

## Inputs

- `src/components/profile/BookingCalendar.tsx` — existing inline `getSlotsForDate` function to extract (lines ~67–97)
- `tests/unit/time-utils.test.ts` — test pattern to follow for vitest structure
- `src/lib/utils/time.ts` — `TimeWindow` interface for reference

## Expected Output

- `src/components/ui/calendar.tsx` — ShadCN Calendar component (auto-generated)
- `src/lib/utils/slots.ts` — extracted `getSlotsForDate` with override-wins-recurring precedence, exported `TimeSlot` and `AvailabilitySlot` interfaces
- `tests/unit/override-precedence.test.ts` — 3+ passing unit tests for precedence logic
- `src/components/profile/BookingCalendar.tsx` — updated imports, inline function removed
