# M004/S02: Per-Date Override Availability — Research

**Date:** 2026-03-11

## Summary

S01 delivered everything S02 needs as a foundation: the `availability_overrides` table is already live (migration `0007`), the `AvailabilityEditor` already has a Radix `Tabs.Root` shell with a disabled "Specific Dates" tab (placeholder text: "Override scheduling for specific dates coming soon."), and the `generate5MinOptions`, `formatTimeLabel`, and `validateNoOverlap` utilities are already extracted and tested in `src/lib/utils/time.ts`.

S02 has two orthogonal deliverables:

1. **Editor-side** — Enable the "Specific Dates" tab in `AvailabilityEditor.tsx` with a date picker + per-date time-range rows, a `saveOverrides` server action in `src/actions/availability.ts`, and a `deleteOverride` server action for removing a date's overrides.

2. **Profile-side** — Update `src/app/[slug]/page.tsx` to also fetch `availability_overrides` for the next 90 days, and extend `BookingCalendar`'s `getSlotsForDate()` to apply override-wins-recurring precedence. The `AvailabilityGrid` (recurring display) does NOT need to change — it only shows the recurring pattern.

The override-wins-recurring precedence logic is the highest-risk piece because it must be correct in both the booking calendar and the public profile page. The rule is: if **any** override row exists for a specific date, use **only** those rows for that date; the recurring `availability` rows are ignored entirely for that date.

## Recommendation

**Build editor-side first (new server action + tab unlock), then profile-side (fetch + precedence).** The server action and editor are self-contained. Unlocking the tab requires no changes outside `AvailabilityEditor.tsx` and a new server action file entry. The profile-side changes touch `[slug]/page.tsx` (data fetch) and `BookingCalendar.tsx` (slot logic) — test these together as a pair since they must both be correct for the feature to be observable.

For the date picker, use the ShadCN `Popover` + `Calendar` (Radix + react-day-picker) pattern already present in the project. Do NOT install a separate date picker library.

For the override-saves server action, follow the same `getClaims()` + delete-then-insert pattern as `updateAvailability` in `src/actions/availability.ts`. Delete all overrides for a `(teacher_id, specific_date)` pair, then insert fresh rows — same atomicity guarantee, no partial-state bugs.

For the profile-side fetch, add a second Supabase query in `[slug]/page.tsx` fetching `availability_overrides` where `specific_date >= today AND specific_date <= today + 90 days`. Pass the results as a new prop to `BookingCalendar`. Do NOT union at the SQL level — application-level merge is more readable and testable.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Date picker UI | ShadCN `Popover` + `Calendar` (react-day-picker already installed) | `react-day-picker` is a peer dep of `@shadcn/ui`; no new install needed; matches the rest of the UI |
| 5-min time dropdowns | `generate5MinOptions()`, `formatTimeLabel()`, `buildHourGroups()` (already in `AvailabilityEditor`) | Reuse the same `TimeSelect` sub-component from S01 directly — it already wraps the grouped 288-option Select |
| Override overlap validation | `validateNoOverlap()` in `src/lib/utils/time.ts` — 25 unit tests already passing | Same per-date windows need the same overlap check as per-day windows |
| Server action auth | `getClaims()` pattern in `updateAvailability` (line 22 of `src/actions/availability.ts`) | DECISIONS.md: use `getClaims()` for availability server actions; `getUser()` is only needed for auth-sensitive payment actions |
| Delete-then-insert | `updateAvailability` pattern (delete all for teacher, insert fresh rows) | Apply per `(teacher_id, specific_date)` scope — delete all overrides for that specific date, insert fresh rows for it |
| Timezone handling for overrides | Use actual `specific_date` directly — no reference-Monday trick needed | Per-date overrides CAN use the real date (unlike recurring slots). `toDate(\`${specific_date}T${time}:00\`, { timeZone })` is simpler and more accurate |
| `revalidatePath` after save | Already in `updateAvailability`: `revalidatePath('/dashboard/availability')` + `revalidatePath('/[slug]', 'page')` | Mirror this exactly in the overrides server action |

## Existing Code and Patterns

- `src/components/dashboard/AvailabilityEditor.tsx` — S01 built a complete tab shell. The "Specific Dates" tab is present but `disabled` (lines ~220–226). S02's editor work is: remove `disabled` from the tab trigger, replace the placeholder `<Tabs.Content value="overrides">` body with the real override date UI, and add override state + save handler. The `TimeSelect`, `buildHourGroups`, and `DAYS` helpers already exist in this file and can be reused as-is.

- `src/actions/availability.ts` — `updateAvailability` is the exact template: `getClaims()` → `getTeacherId()` → Zod validate → delete → insert → `revalidatePath`. Add `saveOverrides(date: string, windows: TimeWindow[])` and `deleteOverridesForDate(date: string)` alongside it. Zod schema for overrides: `{ specific_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`, `start_time`, `end_time` with the same `.refine(end > start)` from `AvailabilitySlotSchema`.

- `src/app/[slug]/page.tsx` — Currently fetches `teacher.availability(*)` in a single join. Add a second Supabase query after the teacher fetch:
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
  Pass `overrides ?? []` as a new `overrides` prop to `<BookingCalendar>`.

- `src/components/profile/BookingCalendar.tsx` — `getSlotsForDate()` (lines ~42–64) currently filters `slots` by `day_of_week` only. Add an `overrides` param to the function and to `BookingCalendarProps`. The new logic:
  1. Filter `overrides` where `override.specific_date === format(date, 'yyyy-MM-dd')`
  2. If any override rows exist → use **only** those (same timezone conversion logic, use actual `specific_date` directly)
  3. If no override rows → fall back to recurring `slots` filtered by `day_of_week` (existing logic, unchanged)

- `supabase/migrations/0007_availability_overrides.sql` — Already created in S01. Table: `(id, teacher_id, specific_date DATE, start_time TIME, end_time TIME, created_at)`. UNIQUE constraint: `(teacher_id, specific_date, start_time)`. RLS: public read + teacher write via `auth.uid()`. No further migration needed for S02.

- `src/lib/utils/time.ts` — `TimeWindow`, `ValidationResult`, `validateNoOverlap` are all already exported and tested. Import them directly in the new server action Zod schema and in the override editor's client-side validation.

- `src/app/(dashboard)/dashboard/availability/page.tsx` — RSC page that renders `<AvailabilityEditor initialSlots={...} />`. S02 needs to also fetch `availability_overrides` for this teacher and pass them as `initialOverrides` prop. This unblocks the editor tab loading existing overrides on page load.

## Constraints

- **`availability_overrides` table is already live** — Migration `0007` shipped in S01. No new DB migration needed for S02. The UNIQUE constraint `(teacher_id, specific_date, start_time)` means the delete-then-insert per `(teacher_id, specific_date)` must delete before inserting, not upsert.

- **Override date must be future-only in the UI** — The date picker should disable past dates. `react-day-picker` supports `disabled` prop; pass `{ before: today }` to prevent past date selection.

- **No ShadCN `Calendar` component may exist yet** — Check if `src/components/ui/calendar.tsx` exists before coding. If it does not, it must be added (standard ShadCN pattern: `npx shadcn@latest add calendar`). Do NOT hand-roll a date picker.

- **`getClaims()` not `getUser()` for override server actions** — DECISIONS.md and S01 T02 pattern. All availability server actions use `getClaims()`. Do not introduce `getUser()` for these.

- **`revalidatePath` must invalidate both dashboard and public profile** — `revalidatePath('/dashboard/availability')` keeps the editor in sync. `revalidatePath('/[slug]', 'page')` propagates to the public page. Both must be present in `saveOverrides` and `deleteOverridesForDate`.

- **Timezone conversion for overrides uses actual date, not reference-Monday** — Unlike recurring slots (which need the reference-Monday trick for stability), per-date overrides have a concrete date. Use `toDate(\`${override.specific_date}T${timeStr}:00\`, { timeZone: teacherTimezone })` directly in `getSlotsForDate`.

- **`availableDays` useMemo in `BookingCalendar` must be updated** — Currently `useMemo(() => new Set(slots.map((s) => s.day_of_week)), [slots])`. If a date has an override but `day_of_week` is not in recurring slots, the calendar date will not be highlighted as available. Must extend `isAvailable()` to also check if an override exists for that specific date. This means `isAvailable` needs access to the override list, and the `calendarDays` rendering must account for override dates.

- **`BookingCalendar` receives `overrides` as a new prop** — This is a breaking interface change. `src/app/[slug]/page.tsx` must pass the new prop. TypeScript will catch any missing prop.

- **Override dates outside the 90-day fetch window** — The booking calendar only looks 90 days ahead. If a teacher sets an override for day 120, it will not appear. This is the accepted tradeoff — document it. The 90-day window matches the milestone research recommendation.

## Common Pitfalls

- **`isAvailable()` only checks `day_of_week`** — After adding overrides, a date with only an override (no recurring slot for that `day_of_week`) must still be clickable. Must update `isAvailable()` to return true if either (a) recurring slot exists for that day-of-week, OR (b) an override exists for that specific date. Forgetting this means override dates never appear as selectable on the calendar.

- **Override date comparison must use `yyyy-MM-dd` string format** — `override.specific_date` from Supabase returns a `DATE` as `"yyyy-MM-dd"` string. Use `format(date, 'yyyy-MM-dd')` from `date-fns` for the comparison. Do NOT use `isSameDay()` on raw Date objects — timezone shifts can flip the date.

- **`slotId` in `TimeSlot` is used as a React key** — For override-derived slots, there is no `id` field (the override rows have an `id` UUID, but it's per-row, not per-slot). Use `\`${override.specific_date}-${startRaw}\`` as the slotId for override-derived slots. Do NOT use the `id` field from `availability_overrides` rows directly unless it's included in the select.

- **Editor override state is separate from recurring schedule state** — The `schedule` state (`Map<number, TimeRange[]>`) in `AvailabilityEditor` is keyed by `day_of_week`. Override state is keyed by `specific_date` (ISO string). Use a `Map<string, TimeRange[]>` for override state — same structure, different key type. Do NOT try to share the same map.

- **Delete-then-insert scope is per `(teacher_id, specific_date)`, NOT per teacher** — Unlike `updateAvailability` which deletes ALL recurring slots for the teacher, `saveOverrides` must delete only the rows for the specific date being saved. Otherwise saving Monday's override wipes Thursday's override.

- **Empty override windows = "no availability on that date"** — If a teacher sets an override for a date with zero time windows (all removed), `saveOverrides` should delete all rows for that date (the delete step without an insert). This is distinct from "no override exists" (recurring applies). The editor must make this intent explicit in the UX — e.g. a "Mark as unavailable" option, or allow saving with zero windows which will show "No times available" on the public page.

- **Don't add override fetch to the recurring `availability` query join** — The current query `supabase.from('teachers').select('*, availability(*)')` is clean. Add the override fetch as a completely separate query. Mixing it into the join (e.g. with a Postgres function or view) adds complexity without benefit at this scale.

## Open Risks

- **ShadCN `Calendar` component** — If `src/components/ui/calendar.tsx` does not exist, the execution task must add it first via `npx shadcn@latest add calendar`. This is a dependency of the override date picker. Must be verified at task start.

- **`isAvailable()` extension complexity** — The current implementation is a simple `availableDays.has(date.getDay())` check. After adding override support, it becomes: `recurringAvailableDays.has(date.getDay()) || overrideDatesSet.has(format(date, 'yyyy-MM-dd'))`. The `overrideDatesSet` must be derived in the same `useMemo` pipeline. Straightforward, but must be wired up correctly or override dates silently fail to be selectable.

- **Editor loads existing overrides** — The availability page RSC (`/dashboard/availability/page.tsx`) currently only fetches `teacher.availability`. It must also fetch `availability_overrides` for this teacher and pass them as `initialOverrides` to `AvailabilityEditor`. Without this, the override tab always appears empty on page load even if overrides are saved.

- **Unit test coverage for precedence logic** — The override-wins-recurring merge logic in `getSlotsForDate()` is the highest-risk correctness surface. It should have unit tests. The `getSlotsForDate` function is not currently tested in `tests/bookings/booking-calendar.test.tsx` (check this). If it isn't, add tests for: (a) no override → recurring applies, (b) override exists → only override slots shown, (c) override with zero windows → empty slot list.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase + Postgres | `supabase/agent-skills@supabase-postgres-best-practices` (34.9K installs) | Available — useful if RLS policy review needed for override table queries |
| react-day-picker / ShadCN Calendar | None found | No dedicated skill — use ShadCN docs and existing `react-day-picker` patterns |

## Sources

- Codebase: `src/components/dashboard/AvailabilityEditor.tsx` — S01 tab shell, disabled "Specific Dates" tab, reusable `TimeSelect`/`buildHourGroups` sub-components
- Codebase: `src/actions/availability.ts` — `getClaims()` auth pattern, delete-then-insert, `revalidatePath` calls
- Codebase: `supabase/migrations/0007_availability_overrides.sql` — already-live `availability_overrides` schema and RLS
- Codebase: `src/components/profile/BookingCalendar.tsx` — `getSlotsForDate()`, `isAvailable()`, `availableDays` useMemo, `TimeSlot` interface
- Codebase: `src/app/[slug]/page.tsx` — teacher + availability fetch pattern; where override fetch must be added
- Codebase: `src/app/(dashboard)/dashboard/availability/page.tsx` — RSC that must also fetch `initialOverrides`
- Codebase: `src/lib/utils/time.ts` — `TimeWindow`, `validateNoOverlap`, `generate5MinOptions` — all reusable for overrides
- Codebase: `src/lib/utils/timezone.ts` — per-date override timezone conversion does NOT need reference-Monday; use actual date directly
- Codebase: `.gsd/DECISIONS.md` — `getClaims()` for availability actions, `getUser()` only for auth-sensitive payment actions, delete-then-insert pattern, override-wins-recurring precedence rule
- Codebase: `tests/unit/time-utils.test.ts` — test pattern to follow for any new unit tests on precedence logic
