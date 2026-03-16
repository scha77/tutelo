# S03: Booking Calendar Integration — Research

**Date:** 2026-03-11

## Summary

S01 and S02 delivered more than expected. By the time S03 executes, the following are already complete and verified:

- `getSlotsForDate()` extracted to `src/lib/utils/slots.ts` with override-wins-recurring precedence (S02/T01)
- `BookingCalendar` accepts `slots` + `overrides` props and passes both to `getSlotsForDate()` (S02/T03)
- `[slug]/page.tsx` fetches `availability_overrides` for the next 90 days and threads them to `BookingCalendar` (S02/T03)
- `isAvailable()` in `BookingCalendar` returns `true` for override-only dates even if no recurring slot exists for that day-of-week (S02/T03)
- 6 unit tests in `tests/unit/override-precedence.test.ts` covering all precedence cases pass (S02/T01)
- `npm run build` passes and all 40 unit tests pass

**What S03 still needs to do:** `getSlotsForDate()` currently returns one `TimeSlot` per availability window (the raw `start_time`/`end_time` of the entire window). A teacher with 3:00–6:00 PM recurring availability today shows exactly one button ("3:00 PM") in the calendar's time-slot panel. Per the committed DECISIONS.md entry, the booking calendar must present slots at **30-minute booking increments** within availability windows. S03's job is to update `getSlotsForDate()` so it expands each availability window into a sequence of 30-min bookable slots.

The change is **surgical and self-contained**: it lives entirely inside `src/lib/utils/slots.ts`. The `BookingCalendar` component, `[slug]/page.tsx`, the DB schema, and the server actions don't need to change. The `TimeSlotButton` renders one button per `TimeSlot` — that contract is unchanged. S03 also needs unit tests for the new expansion logic and must flag the downstream payment amount concern with `create-intent`.

## Recommendation

**Build in one focused task:** update `generateSlotsFromWindow` as an extracted helper inside `slots.ts`, apply it to both the recurring and override paths in `getSlotsForDate()`, write tests covering edge cases (window shorter than 30 min, window exactly 30 min, window with non-30-min-aligned boundaries like 3:30–4:45), and run the full test suite to confirm no regressions.

The 30-min increment rule: generate slots at `windowStart`, `windowStart+30`, `windowStart+60`, ... while `slotStart + 30min <= windowEnd`. Each slot's `startRaw` = the increment value, `endRaw` = `startRaw + 30min`, `slotId` = `${dateStr}-${startRaw}` (the existing pattern, now unique per 30-min increment since each has a distinct start time).

**Payment amount for sub-hour slots** is the only open question S03 must resolve. The `create-intent` route currently uses `teacher.hourly_rate * 100` cents for every booking, regardless of duration. A 30-min slot should cost `hourly_rate / 2`. S03 must update `create-intent` to compute amount from the actual session duration (`endTime - startTime` in minutes / 60 * hourly_rate) rather than assuming 1 hour. This is a small change in one route but has payment consequences if left unfixed.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| 30-min time arithmetic | `toDate()` from `date-fns-tz` + plain timestamp addition | Already imported in `slots.ts` — `toDate()` creates a UTC-correct Date; add 30 * 60 * 1000 ms; format back to `HH:MM` with `formatInTimeZone` |
| Override-wins-recurring precedence | `getSlotsForDate()` in `src/lib/utils/slots.ts` | Already complete and tested in S02/T01 — only the expansion loop inside each path changes |
| Slot ID uniqueness | `${dateStr}-${startRaw}` pattern already used for override slots | Works for all 30-min increments since each has a distinct `startRaw` |
| Unit test infrastructure | Vitest with `vi.useFakeTimers()` pattern already in `override-precedence.test.ts` | Same pattern for controlling `new Date()` in "past slot" filtering |

## Existing Code and Patterns

- `src/lib/utils/slots.ts` — The entire S03 change lives here. `getSlotsForDate()` has two paths: override path (lines 70–84) and recurring path (lines 92–106). Both currently use `.flatMap()` to produce one `TimeSlot` per row. Replace each `flatMap` body with a call to a new `generateSlotsFromWindow(dateStr, startRaw, endRaw, now, teacherTimezone, visitorTimezone)` helper that produces the 30-min increment slots from a single window. The helper is pure and testable in isolation.
- `src/lib/utils/slots.ts` — `toDate()` and `formatInTimeZone()` are already imported from `date-fns-tz`. Use `toDate(...)` to construct a UTC Date for the start of each 30-min slot, then `startDate.getTime() + 30 * 60 * 1000` to advance. Format with `formatInTimeZone(slotStart, teacherTimezone, 'HH:mm')` to get `startRaw`.
- `tests/unit/override-precedence.test.ts` — The test pattern to follow: `vi.useFakeTimers()` + `vi.setSystemTime(...)` controls the `now` comparison used to filter past slots. New tests in `tests/unit/booking-slots.test.ts` should use the same setup.
- `src/app/api/direct-booking/create-intent/route.ts` — Line 70: `const amountInCents = Math.round((teacher.hourly_rate ?? 0) * 100)`. This hardcodes a 1-hour session amount. With 30-min slots, it must compute `durationMinutes = timeDiff(endTime, startTime)` and then `amount = Math.round((durationMinutes / 60) * hourly_rate * 100)`. The `startTime`/`endTime` are already in the request body.
- `src/lib/utils/time.ts` — `generate5MinOptions()` and `formatTimeLabel()` exist here but are not needed for S03's 30-min slot generation. The slot generation works in epoch time, not the options array.

## Constraints

- **`bookings_unique_slot` is `UNIQUE(teacher_id, booking_date, start_time)`** — 30-min slots all have distinct `start_time` values (15:00, 15:30, 16:00, etc.), so they satisfy the uniqueness constraint correctly. No schema change needed.
- **`BookingRequestSchema` validates `startTime` and `endTime` as `HH:MM`** — 30-min slot `startRaw`/`endRaw` are already `HH:MM` strings. No schema change needed.
- **Past-slot filtering must remain** — The existing `if (startDate <= now) return []` guard (applied per-slot) must still be applied to each 30-min increment. A slot starting at 15:00 today when it's already 15:25 must be filtered out.
- **Slots that end past the availability window must be excluded** — A 30-min slot is only valid if `slotStart + 30 minutes <= windowEnd`. Do not include a slot that would overflow the teacher's stated availability window.
- **No changes to `BookingCalendar.tsx` or `[slug]/page.tsx`** — The component interface (`TimeSlot[]` from `getSlotsForDate`) is unchanged. S03 is entirely contained in `slots.ts` plus `create-intent`.
- **`date-fns` v4 installed** — `addMinutes` exists in v4. Can use either `new Date(existingDate.getTime() + 30 * 60_000)` (safe) or `addMinutes(date, 30)`. The existing `slots.ts` uses raw `toDate()` + timestamp math and `formatInTimeZone` — match that pattern.

## Common Pitfalls

- **Window shorter than 30 minutes** — A teacher could have a 20-min availability window (e.g., 3:40–4:00 from an unusual override). `while (slotStart + 30min <= windowEnd)` never triggers → zero slots → empty panel for that window. This is correct behavior: the slot can't fit. No crash, just empty. Write a unit test for this case.
- **Window exactly 30 minutes** — `15:00–15:30`: the loop should produce exactly one slot. The condition `slotStart + 30 <= windowEnd` with `slotStart=15:00` and `windowEnd=15:30`: `15:30 <= 15:30` is `true`. Include the slot.
- **Non-aligned boundaries (e.g., 3:30–4:45)** — 3:30+30=4:00 ≤ 4:45 → include 3:30. 4:00+30=4:30 ≤ 4:45 → include 4:00. 4:30+30=5:00 > 4:45 → stop. Result: 2 slots. Verify with a unit test.
- **slotId uniqueness** — With the original one-slot-per-window approach, recurring slots used `slot.id` (the DB row UUID) as the slotId. With 30-min increments, `slot.id` is not a valid discriminator for sub-slots within the same window. Switch to the override pattern: `slotId = ${dateStr}-${startRaw}` for **both** recurring and override paths. `startRaw` is unique per slot since no two 30-min slots in the same day can share the same start time (non-overlapping constraint enforced at save time).
- **Payment amount regression** — If `create-intent` is not updated and a parent books a 30-min slot, they are charged the full hourly rate. This is a billing bug that must be fixed in the same slice, not deferred.
- **`endRaw` for the last slot in a window** — If the last slot starts at 5:30 and the window ends at 6:00, `endRaw = "18:00"` exactly equals `windowEnd`. This is correct — the slot's end aligns exactly with the teacher's stated end time.
- **Timezone arithmetic correctness** — Time math for incrementing must happen in UTC (via `Date` epoch time), not by string manipulation of `HH:MM`. Use `toDate(dateStr + 'T' + startRaw + ':00', { timeZone: teacherTimezone })` to get a UTC epoch, then add 30 * 60_000 ms to advance to the next slot. Format back to `HH:MM` with `formatInTimeZone(slotStartDate, teacherTimezone, 'HH:mm')`.

## Open Risks

- **Payment amount for 30-min slots** — The `create-intent` route charges `hourly_rate * 100` cents regardless of session duration. Changing this to duration-prorated charging means: a 30-min booking costs `hourly_rate / 2`. This is the correct behavior economically but requires updating the route. Note: `hourly_rate` in the `teachers` table is set by teachers and labeled "hourly" — parents see the slot, not an explicit duration. If teachers set $60/hr, a 30-min slot should cost $30. **Recommend: fix the proration in `create-intent` within S03.** If there is concern about changing billing behavior mid-launch, the alternative is to mark as a documented caveat and defer to a pricing decision. Either way, the team must be aware of this before S03 ships.
- **Slot count density for large windows** — A teacher with 8:00 AM–8:00 PM availability (12 hours) generates 24 × 2 = 24 slots. With multiple windows across multiple days, the time-slot panel could show many buttons. The panel currently uses `space-y-2` with a fixed-width 64 (`md:w-64`). 24 buttons stacked is ~600px tall — visible but scrollable. Acceptable for MVP; no layout change needed.
- **`generate-intent` uses `body.startTime`/`body.endTime` without validation** — The route does not verify that `endTime - startTime = 30 minutes`. A malicious client could pass arbitrary `endTime` values and get incorrect payment amounts. In MVP this is low risk (the client controls this for their own booking), but worth a future hardening note.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| date-fns-tz | (no dedicated skill found) | Not applicable — already used correctly in `slots.ts` |
| Vitest | (no dedicated skill needed) | Pattern established in `override-precedence.test.ts` |

## Sources

- `src/lib/utils/slots.ts` — current `getSlotsForDate()` implementation; one-slot-per-window behavior confirmed
- `src/components/profile/BookingCalendar.tsx` — `TimeSlotButton` renders one button per `TimeSlot`; `timeSlotsForDay` useMemo calls `getSlotsForDate()`; `selectedSlot.startRaw`/`endRaw` sent to booking actions
- `src/app/[slug]/page.tsx` — `availability_overrides` fetch for next 90 days already wired; `overrides` prop passed to `BookingCalendar`
- `src/app/api/direct-booking/create-intent/route.ts` — `amountInCents = hourly_rate * 100` (1-hour hardcode); `startTime`/`endTime` in request body; must be updated for duration-prorated amounts
- `supabase/migrations/0001_initial_schema.sql` — `bookings_unique_slot UNIQUE(teacher_id, booking_date, start_time)`; confirms 30-min start times are safely bookable
- `src/lib/schemas/booking.ts` — `startTime`/`endTime` as `HH:MM` regex; no change needed
- `tests/unit/override-precedence.test.ts` — `vi.useFakeTimers()` test pattern; established unit test structure for `getSlotsForDate`
- `.gsd/DECISIONS.md` — "Booking calendar presents slots at 30-min booking increments within availability windows" (committed decision)
- `.gsd/milestones/M004/slices/S02/tasks/T03-SUMMARY.md` — Confirms override precedence, `isAvailable()` extension, and `overrides` prop are complete; S03 does not need to re-implement these
