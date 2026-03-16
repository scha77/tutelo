---
estimated_steps: 5
estimated_files: 1
---

# T03: Build the recurring availability editor with time-range pickers

**Slice:** S01 — Recurring Availability Editor with 5-Min Granularity
**Milestone:** M004

## Description

Complete rewrite of `AvailabilityEditor.tsx` — replacing the 1-hour toggle grid with a per-day time-range picker UI. Each day of the week shows a list of time-range rows (start/end ShadCN Select dropdowns), with "Add window" and remove buttons. A Tabs shell from radix-ui scaffolds the Recurring/Override layout (Override tab disabled for S02). Client-side overlap validation runs before save. The component preserves the existing `AvailabilityEditorProps` interface, `useTransition` + `startTransition` save pattern, and `toast` notifications.

## Steps

1. Rewrite `src/components/dashboard/AvailabilityEditor.tsx`:
   - Import `generate5MinOptions`, `formatTimeLabel`, `validateNoOverlap` from `@/lib/utils/time`
   - Import `Tabs` from `radix-ui` for tab shell
   - Import `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel` from `@/components/ui/select`
   - Import `Button` from `@/components/ui/button`
   - Keep existing `AvailabilityEditorProps` interface (`initialSlots: AvailabilitySlot[]`)
2. Initialize state from `initialSlots`:
   - Normalize `HH:MM:SS` → `HH:MM` via `.slice(0, 5)` on `start_time` and `end_time`
   - Group by `day_of_week` into `Map<number, {start_time: string, end_time: string}[]>`
   - Use `useState` with a lazy initializer for this grouping
   - Memoize `generate5MinOptions()` result with `useMemo` (computed once, 288 items)
3. Build the per-day time-range UI:
   - Render `Tabs.Root` with `Tabs.List` containing two triggers: "Weekly Schedule" (active) and "Specific Dates" (disabled, `data-disabled`, placeholder for S02)
   - Inside `Tabs.Content` for "Weekly Schedule": render 7 day sections (Sunday–Saturday)
   - Each day section: day label, list of time-range rows, "Add time window" button
   - Each time-range row: start `Select` dropdown, "to" label, end `Select` dropdown, remove button (trash icon or "×")
   - Select dropdowns show 288 options grouped by hour (use `SelectGroup` + `SelectLabel` for hour headers like "8 AM", "9 AM")
   - "Add time window" adds a new row with default empty/placeholder values
   - Remove button deletes the row from that day's array
4. Implement save flow:
   - On save click: collect all windows from all days, run `validateNoOverlap` per day
   - If any day has overlaps: show `toast.error` with the validation error and abort
   - If valid: flat-map all windows to `{day_of_week, start_time, end_time}[]`, call `updateAvailability` via `startTransition`
   - Show `toast.success` or `toast.error` based on server action result
   - Display summary of total windows across all days
5. Verify the complete flow:
   - `npm run build` passes
   - Browser: navigate to `/dashboard/availability`, confirm the new editor renders with day sections and dropdowns
   - Add a time window (e.g., Monday 3:30 PM – 4:45 PM), save, reload — data persists
   - Remove all windows for a day, save — no errors (empty state valid)
   - Try overlapping windows on same day — blocked by validation toast

## Must-Haves

- [ ] Per-day time-range rows with ShadCN Select dropdowns (start + end) at 5-min granularity
- [ ] "Add time window" button per day, remove button per row
- [ ] State initialized from `initialSlots` with `HH:MM:SS` → `HH:MM` normalization
- [ ] Tab shell with "Weekly Schedule" active, "Specific Dates" disabled
- [ ] Client-side overlap validation per day before save (via `validateNoOverlap`)
- [ ] Save flow: flat-map → `updateAvailability` → toast feedback, using `useTransition` + `startTransition`
- [ ] `AvailabilityEditorProps` interface unchanged (backward-compatible with RSC page)
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — zero errors
- Browser: editor loads, existing slots render as time-range rows, adding/removing/saving works, overlap validation fires, reload shows persisted data
- `npx vitest run tests/unit/time-utils.test.ts` — still passes (no regressions in utilities)

## Observability Impact

- Signals added/changed: Client-side overlap validation errors shown as `toast.error` before network call; server action errors shown as `toast.error` after call; success shown as `toast.success`
- How a future agent inspects this: Open browser dev tools → check for toast notifications; inspect `availability` table in Supabase for saved rows; component state visible via React DevTools
- Failure state exposed: Overlap validation returns `{valid: false, error: "..."}` shown in toast; server action `{error: "..."}` shown in toast

## Inputs

- `src/lib/utils/time.ts` — `generate5MinOptions`, `formatTimeLabel`, `validateNoOverlap` (from T01)
- `src/actions/availability.ts` — `updateAvailability` with `end_time > start_time` validation (from T02)
- `src/components/ui/select.tsx` — ShadCN Select primitives
- `src/components/ui/button.tsx` — ShadCN Button
- `radix-ui` — `Tabs` component (`import { Tabs } from 'radix-ui'`)
- `src/app/(dashboard)/dashboard/availability/page.tsx` — RSC that passes `initialSlots` (unchanged)

## Expected Output

- `src/components/dashboard/AvailabilityEditor.tsx` — complete rewrite with time-range picker paradigm, tab shell, overlap validation, save round-trip
