---
estimated_steps: 5
estimated_files: 4
---

# T03: Wire override data into public profile and BookingCalendar with precedence

**Slice:** S02 — Per-Date Override Availability
**Milestone:** M004

## Description

Complete the user-facing integration by fetching override data on the public profile page and threading it into `BookingCalendar`. Update `getSlotsForDate` calls to pass overrides, extend `isAvailable()` and `availableDays` to account for override dates, and ensure the precedence unit tests from T01 all pass against the final wired-up logic. This task makes overrides visible to parents visiting a teacher's page.

## Steps

1. In `src/app/[slug]/page.tsx`, add a second Supabase query after the existing teacher fetch:
   ```ts
   const { data: overrides } = await supabase
     .from('availability_overrides')
     .select('specific_date, start_time, end_time')
     .eq('teacher_id', teacher.id)
     .gte('specific_date', format(today, 'yyyy-MM-dd'))
     .lte('specific_date', format(addDays(today, 90), 'yyyy-MM-dd'))
     .order('specific_date')
     .order('start_time')
   ```
   Import `format`, `addDays`, `startOfToday` from `date-fns`. Pass `overrides={overrides ?? []}` as a new prop to `<BookingCalendar>`.

2. Update `BookingCalendarProps` in `BookingCalendar.tsx` to accept `overrides: Array<{ specific_date: string; start_time: string; end_time: string }>`. Destructure from props. Update the `timeSlotsForDay` useMemo to pass `overrides` to `getSlotsForDate()` from `src/lib/utils/slots.ts`.

3. Update `availableDays` useMemo and `isAvailable()` in `BookingCalendar.tsx`. Create a `overrideDatesSet` as `new Set(overrides.map(o => o.specific_date))` inside a useMemo. Update `isAvailable(date)` to return true if EITHER `availableDays.has(date.getDay())` OR `overrideDatesSet.has(format(date, 'yyyy-MM-dd'))` (and date is not in the past). This ensures calendar dates with overrides but no recurring slot for that day-of-week are still selectable.

4. Verify override-derived `TimeSlot` objects in `slots.ts` use `${specific_date}-${startRaw}` as `slotId` (done in T01). Verify timezone conversion for override slots uses the actual `specific_date` directly (not the reference-Monday trick). Ensure `startRaw` and `endRaw` are correctly set on override-derived slots so booking form submission works with the same data shape.

5. Run `npx vitest run tests/unit/override-precedence.test.ts` — all precedence tests pass. Run `npx vitest run tests/unit/time-utils.test.ts` — no regressions. Run `npm run build` — zero errors. Verify end-to-end: if a teacher has an override for a specific date, visiting their public page and clicking that date shows only override slots.

## Must-Haves

- [ ] `[slug]/page.tsx` fetches `availability_overrides` for next 90 days and passes to `BookingCalendar`
- [ ] `BookingCalendar` accepts and uses `overrides` prop
- [ ] `getSlotsForDate()` call passes overrides — override-wins-recurring precedence active
- [ ] `isAvailable()` returns true for dates with overrides (even if no recurring slot for that day-of-week)
- [ ] Override-derived `TimeSlot` uses `${specific_date}-${startRaw}` as `slotId`
- [ ] Override timezone conversion uses actual date (not reference-Monday)
- [ ] All precedence unit tests pass
- [ ] `npm run build` passes

## Verification

- `npx vitest run tests/unit/override-precedence.test.ts` — all pass
- `npx vitest run tests/unit/time-utils.test.ts` — all 25 pass (no regressions)
- `npm run build` — zero errors
- On public profile: date with override → only override slots shown; date without override → recurring slots shown; date with zero-window override → "no times available"

## Observability Impact

- Signals added/changed: None new — override fetch errors surface via Supabase query failure (returns null/empty); slot rendering is pure
- How a future agent inspects this: Query `availability_overrides` table to verify data; check BookingCalendar rendered slots vs expected; browser console for runtime errors
- Failure state exposed: Missing overrides prop → TypeScript compile error; wrong precedence → unit test failure; wrong timezone conversion → visible time mismatch on public page

## Inputs

- `src/lib/utils/slots.ts` — `getSlotsForDate` with override precedence (from T01)
- `tests/unit/override-precedence.test.ts` — precedence tests (from T01)
- `src/app/[slug]/page.tsx` — existing teacher fetch to extend
- `src/components/profile/BookingCalendar.tsx` — updated imports from T01, add overrides prop
- T02 output — server actions and editor working (overrides exist in DB to test against)

## Expected Output

- `src/app/[slug]/page.tsx` — fetches overrides, passes to BookingCalendar
- `src/components/profile/BookingCalendar.tsx` — accepts `overrides` prop, `isAvailable()` checks override dates, `timeSlotsForDay` uses override precedence
- `tests/unit/override-precedence.test.ts` — all tests passing (may add additional edge case tests)
- `src/lib/utils/slots.ts` — any final adjustments to ensure timezone handling and slotId generation are correct
