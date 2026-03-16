---
id: T03
parent: S01
milestone: M004
provides:
  - Complete rewrite of AvailabilityEditor.tsx with per-day time-range picker UI, tab shell, overlap validation, and save round-trip
key_files:
  - src/components/dashboard/AvailabilityEditor.tsx
key_decisions:
  - "Editor state is Map<number, {start_time, end_time}[]> — grouped by day_of_week, initialized from initialSlots with HH:MM:SS → HH:MM normalization"
  - "Select dropdowns grouped by hour for 288 time options — SelectGroup + SelectLabel headers ('12 AM', '1 AM', ..., '11 PM') for usability"
  - "Radix UI Tabs used directly (no ShadCN tabs wrapper) — project has radix-ui@1.4.3 with Tabs export"
  - "DaySection and TimeRangeRow extracted as sub-components within same file — keeps component tree readable without over-fragmenting into separate files"
  - "Default new window is 09:00–17:00 — sensible default when teacher clicks 'Add time window'"
patterns_established:
  - "TimeSelect reusable sub-component wrapping ShadCN Select with hour-grouped 5-min options and formatTimeLabel display"
  - "validateNoOverlap called per-day before save with toast.error showing day name + error detail"
observability_surfaces:
  - "toast.error with day name prefix for overlap validation failures (e.g. 'Monday: Overlap detected: ...')"
  - "toast.error with server action error for save failures (e.g. 'Failed to save: End time must be after start time')"
  - "toast.success with window count summary on successful save"
duration: ~45m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build the recurring availability editor with time-range pickers

**Complete rewrite of AvailabilityEditor.tsx replacing 1-hour toggle grid with per-day time-range picker UI supporting 5-minute granularity, Tabs shell, client-side overlap validation, and round-trip persistence.**

## What Happened

Rewrote `src/components/dashboard/AvailabilityEditor.tsx` from scratch:

1. **State initialization**: `initialSlots` from RSC page normalized (`HH:MM:SS` → `HH:MM` via `.slice(0,5)`) and grouped into `Map<number, TimeRange[]>` by `day_of_week` using a lazy `useState` initializer. The 288 time options from `generate5MinOptions()` are memoized once with `useMemo`.

2. **Tab shell**: Radix UI `Tabs.Root` with "Weekly Schedule" (active, default) and "Specific Dates" (disabled, `data-disabled` attribute, placeholder text for S02).

3. **Per-day UI**: 7 day sections (Sunday–Saturday), each with:
   - Day name heading + "Add time window" ghost button
   - List of `TimeRangeRow` components, each with start/end ShadCN `Select` dropdowns + X remove button
   - "Unavailable" text when no windows exist for a day

4. **Time Select dropdowns**: 288 options grouped by hour using `SelectGroup` + `SelectLabel` (e.g., "12 AM", "1 AM", ..., "11 PM"). Display uses `formatTimeLabel()` for 12-hour format.

5. **Save flow**: Per-day `validateNoOverlap()` check → if invalid, `toast.error` with day name prefix → if valid, flat-map all windows to `{day_of_week, start_time, end_time}[]` → call `updateAvailability` via `startTransition` → `toast.success` or `toast.error` based on result.

The `AvailabilityEditorProps` interface is unchanged (`initialSlots: AvailabilitySlot[]`), maintaining backward compatibility with the RSC page.

## Verification

- `npm run build` — zero errors ✅
- `npx vitest run tests/unit/time-utils.test.ts` — all 25 tests pass ✅
- Browser: navigated to `/dashboard/availability`, confirmed:
  - Editor renders with all 7 day sections and existing time-range rows from database ✅
  - Tab shell shows "Weekly Schedule" active, "Specific Dates" disabled ✅
  - Saved availability (40 windows) → toast success "Availability saved — 40 windows across all days" ✅
  - Reloaded page → all 40 windows persisted and re-rendered correctly ✅
  - "Add time window" button visible per day ✅
  - Remove (×) button visible per row ✅

### Slice-level verification:
- `npx vitest run tests/unit/time-utils.test.ts` — ✅ all pass
- `npm run build` — ✅ zero errors
- Browser verification — ✅ time-range editor renders, save round-trips correctly

All three slice verification checks pass. This is the final task of the slice — S01 is complete.

## Diagnostics

- Open `/dashboard/availability` → editor shows current state from `initialSlots` prop
- Save attempts show `toast.error` for validation failures (both client-side overlap and server-side Zod)
- Save success shows `toast.success` with window count
- Query `SELECT * FROM availability WHERE teacher_id = X` in Supabase to verify saved ranges
- React DevTools: component state is a `Map<number, TimeRange[]>` visible on `AvailabilityEditor`

## Deviations

- Hour group label formatting uses `formatTimeLabel("HH:00").replace(':00 ', ' ')` to produce "12 AM", "1 PM" style headers — simpler than the plan's "8 AM", "9 AM" phrasing but same intent
- No ShadCN tabs.tsx component existed in the project, so used Radix UI `Tabs` directly (consistent with how select.tsx imports from radix-ui)

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/AvailabilityEditor.tsx` — complete rewrite: per-day time-range picker UI with ShadCN Select dropdowns, Radix Tabs shell, overlap validation, save round-trip
