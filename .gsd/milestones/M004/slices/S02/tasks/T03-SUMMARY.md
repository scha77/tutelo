---
id: T03
parent: S02
milestone: M004
provides:
  - Public profile fetches and displays override availability for teacher dates
  - BookingCalendar accepts overrides prop and applies override-wins-recurring precedence
  - Calendar dates with overrides are selectable even without matching recurring day-of-week
key_files:
  - src/app/[slug]/page.tsx
  - src/components/profile/BookingCalendar.tsx
key_decisions:
  - Override fetch window is 90 days from today, matching the calendar's practical browsable range
  - isAvailable() checks both recurring day-of-week AND override dates set, so override-only dates appear selectable in the calendar grid
patterns_established:
  - Override data flows RSC → client component via serializable prop (Array<{specific_date, start_time, end_time}>)
  - overrideDatesSet useMemo for O(1) date lookup in isAvailable()
observability_surfaces:
  - Supabase query failure returns null → falls back to empty array (no overrides shown, recurring still works)
  - TypeScript compile error if overrides prop missing (build-time safety)
  - Unit tests catch precedence regressions
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Wire override data into public profile and BookingCalendar with precedence

**Public profile now fetches override availability and BookingCalendar renders override-only slots for override dates, falling back to recurring for all other dates.**

## What Happened

Added a Supabase query in `[slug]/page.tsx` that fetches `availability_overrides` for the next 90 days (filtered by teacher_id, date range, ordered by date and start_time). The result is passed as `overrides` prop to `BookingCalendar`.

Updated `BookingCalendar` to:
1. Accept the new `overrides` prop in its interface
2. Pass overrides through to `getSlotsForDate()` (the utility extracted in T01 that implements override-wins-recurring precedence)
3. Compute an `overrideDatesSet` via useMemo for O(1) lookups
4. Extend `isAvailable()` to return true for dates in the override set, even if no recurring slot exists for that day-of-week — this makes override-only dates clickable in the calendar grid

Verified that `slots.ts` already correctly:
- Uses `${dateStr}-${startRaw}` as slotId for override-derived slots
- Converts override times using the actual specific_date (not a reference Monday)
- Sets `startRaw`/`endRaw` on override slots for booking form submission compatibility

## Verification

- `npx vitest run tests/unit/override-precedence.test.ts` — **6/6 passed** (no override → recurring, override exists → only override, zero-window → empty, other-date overrides ignored, sort order, no-recurring-no-override → empty)
- `npx vitest run tests/unit/time-utils.test.ts` — **25/25 passed** (no regressions)
- `npm run build` — **zero errors**, all routes compile

### Slice-level verification status
- ✅ Override precedence unit tests pass
- ✅ Time utils regression tests pass
- ✅ Build passes with zero errors
- ✅ Manual verification pattern available (save overrides via editor → visit public profile → see override slots)

## Diagnostics

- Query `availability_overrides` table in Supabase to verify data exists for a teacher
- Check BookingCalendar rendered slots vs expected for a given date
- Browser console for runtime errors on public profile page
- If overrides query fails, Supabase returns null → empty array fallback → recurring behavior preserved

## Deviations

None — implementation matched plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/app/[slug]/page.tsx` — Added date-fns imports, override query for next 90 days, passes `overrides` prop to BookingCalendar
- `src/components/profile/BookingCalendar.tsx` — Added `overrides` to props interface, destructured in component, added `overrideDatesSet` useMemo, updated `timeSlotsForDay` to pass overrides to `getSlotsForDate`, extended `isAvailable()` to check override dates
