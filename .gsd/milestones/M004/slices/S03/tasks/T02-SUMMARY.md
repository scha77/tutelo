---
id: T02
parent: S03
milestone: M004
provides:
  - computeSessionAmount() pure helper for duration-prorated payment calculation
  - create-intent route now charges based on actual session duration, not hardcoded 1-hour
key_files:
  - src/lib/utils/booking.ts
  - src/app/api/direct-booking/create-intent/route.ts
  - tests/unit/payment-proration.test.ts
key_decisions:
  - Placed computeSessionAmount in src/lib/utils/booking.ts (new shared util) rather than co-locating with the route — keeps the route file focused and the function independently importable/testable
patterns_established:
  - Pure math helpers in src/lib/utils/booking.ts for booking-related calculations
observability_surfaces:
  - none — computeSessionAmount is pure math; existing console.error in create-intent already logs payment failures
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Prorate payment amount by session duration in create-intent and verify build

**Extracted `computeSessionAmount()` pure helper and updated create-intent to charge duration-prorated amounts instead of hardcoded full hourly rate.**

## What Happened

Created `src/lib/utils/booking.ts` with an exported `computeSessionAmount(startTime, endTime, hourlyRate)` function that parses HH:MM times, computes duration in minutes, and returns `Math.round((durationMinutes / 60) * hourlyRate * 100)` in cents. Returns 0 for non-positive durations.

Updated `src/app/api/direct-booking/create-intent/route.ts` to import and use `computeSessionAmount(startTime, endTime, teacher.hourly_rate ?? 0)` replacing the previous `Math.round((teacher.hourly_rate ?? 0) * 100)` which always charged the full hourly rate regardless of slot duration.

Created `tests/unit/payment-proration.test.ts` with 7 test cases covering 30-min, 60-min, 45-min, 20-min durations, zero rate, zero duration, and negative duration edge cases.

## Verification

- `npx vitest run tests/unit/payment-proration.test.ts` — 7/7 tests pass
- `npx vitest run` — 182 tests pass, 26 test files pass (10 skipped), zero failures
- `npm run build` — compiled successfully, zero errors

### Slice-level verification (S03 final task):
- ✅ `npx vitest run tests/unit/booking-slots.test.ts` — 9 tests pass
- ✅ `npx vitest run tests/unit/override-precedence.test.ts` — 6 tests pass
- ✅ `npx vitest run tests/unit/payment-proration.test.ts` — 7 tests pass
- ✅ `npx vitest run` — full suite passes (182 tests)
- ✅ `npm run build` — zero errors

## Diagnostics

Run `npx vitest run tests/unit/payment-proration.test.ts` — each test name identifies the exact proration scenario. If a specific duration breaks, the test name pinpoints it (e.g., "30-min slot charges half the hourly rate").

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/utils/booking.ts` — new file with exported `computeSessionAmount()` pure function
- `src/app/api/direct-booking/create-intent/route.ts` — imported `computeSessionAmount`, replaced hardcoded `hourlyRate * 100` with duration-prorated calculation
- `tests/unit/payment-proration.test.ts` — new file with 7 proration test cases
