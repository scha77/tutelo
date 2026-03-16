---
estimated_steps: 5
estimated_files: 3
---

# T02: Build override server actions and wire the "Specific Dates" editor tab

**Slice:** S02 — Per-Date Override Availability
**Milestone:** M004

## Description

Add `saveOverrides` and `deleteOverridesForDate` server actions following the existing `getClaims()` + delete-then-insert pattern. Enable the "Specific Dates" tab in `AvailabilityEditor` with a date picker (ShadCN Calendar + Popover), per-date time-range rows reusing existing `TimeSelect`, and save/delete handlers. Update the dashboard availability RSC page to fetch and pass `initialOverrides` so existing overrides load on page open.

## Steps

1. Add `saveOverrides` server action to `src/actions/availability.ts`. Signature: `saveOverrides(specificDate: string, windows: { start_time: string, end_time: string }[])`. Auth with `getClaims()`, get `teacherId` via existing `getTeacherId()`. Zod schema: `specific_date` as `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`, array of `{ start_time, end_time }` with same `.refine(end > start)` as `AvailabilitySlotSchema`. Validate no overlap with `validateNoOverlap`. Delete all `availability_overrides` for `(teacher_id, specific_date)`, then insert new rows (skip insert if windows array is empty — this means "unavailable on this date"). Call `revalidatePath('/dashboard/availability')` and `revalidatePath('/[slug]', 'page')`. Return `{ error?: string }`.

2. Add `deleteOverridesForDate` server action to `src/actions/availability.ts`. Signature: `deleteOverridesForDate(specificDate: string)`. Auth with `getClaims()` + `getTeacherId()`. Delete all rows from `availability_overrides` where `teacher_id` and `specific_date` match. Revalidate same paths. Return `{ error?: string }`. This action is used when the teacher wants to revert a date to recurring behavior (distinct from saving zero windows which means "unavailable").

3. Update `src/app/(dashboard)/dashboard/availability/page.tsx` to also fetch `availability_overrides` for the current teacher (all rows, no date filter — teacher sees all their overrides). Pass the result as `initialOverrides` prop to `<AvailabilityEditor>`.

4. In `AvailabilityEditor.tsx`: Remove `disabled` from the "Specific Dates" tab trigger. Add override state as `Map<string, { start_time: string, end_time: string }[]>` initialized from `initialOverrides` prop (grouped by `specific_date`). Build the tab content: a date picker using ShadCN `Popover` + `Calendar` (disable past dates via `{ before: today }`), a list of dates that have overrides (clickable to select), and per-date time-range rows reusing the existing `TimeSelect` sub-component pattern. Add "Add Time Window" button per date, "Remove" per window. Wire save button to call `saveOverrides` server action with sonner toast feedback. Wire a "Revert to recurring" button per date that calls `deleteOverridesForDate` and removes the date from local state. Wire a "Mark as unavailable" action that calls `saveOverrides` with empty windows array.

5. Run `npm run build` to verify zero type errors. Manually verify: editor tab opens, date picker renders, time ranges can be added/removed, save produces no errors (functional round-trip tested via Supabase).

## Must-Haves

- [ ] `saveOverrides` server action with `getClaims()` auth, Zod validation, overlap check, delete-then-insert per `(teacher_id, specific_date)`
- [ ] `deleteOverridesForDate` server action with `getClaims()` auth, deletes all overrides for a specific date
- [ ] Dashboard RSC fetches `availability_overrides` and passes as `initialOverrides`
- [ ] "Specific Dates" tab enabled and functional: date picker + per-date time ranges + save/delete
- [ ] Empty windows saved = "unavailable on this date" (delete rows, no insert)
- [ ] "Revert to recurring" removes override for a date entirely
- [ ] Sonner toast feedback on save success/error
- [ ] `npm run build` passes

## Verification

- `npm run build` — zero errors
- Editor: open "Specific Dates" tab → pick a date → add time range → save → reload → overrides persist
- Editor: save a date with zero time windows → reload → date shows as "unavailable" override
- Editor: click "Revert to recurring" → reload → override removed, recurring applies

## Observability Impact

- Signals added/changed: Server actions return `{ error: string }` with specific messages for auth failure, validation failure, DB error; sonner toasts surface errors in UI
- How a future agent inspects this: Query `availability_overrides` table in Supabase; check server action return values; inspect sonner toast messages in browser
- Failure state exposed: Zod validation errors (invalid date format, end before start, overlapping windows), auth errors (not authenticated, teacher not found), Supabase insert/delete errors

## Inputs

- `src/actions/availability.ts` — existing `updateAvailability` as pattern template, `getTeacherId` helper
- `src/components/dashboard/AvailabilityEditor.tsx` — existing tab shell with disabled "Specific Dates" tab, `TimeSelect` sub-component
- `src/components/ui/calendar.tsx` — ShadCN Calendar (installed in T01)
- `src/lib/utils/time.ts` — `validateNoOverlap`, `generate5MinOptions`, `formatTimeLabel`
- T01 output — ShadCN Calendar component confirmed installed

## Expected Output

- `src/actions/availability.ts` — updated with `saveOverrides` and `deleteOverridesForDate` server actions
- `src/components/dashboard/AvailabilityEditor.tsx` — "Specific Dates" tab fully functional with date picker, per-date time ranges, save/delete/revert handlers
- `src/app/(dashboard)/dashboard/availability/page.tsx` — fetches `initialOverrides` and passes to editor
