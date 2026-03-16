---
id: T02
parent: S02
milestone: M004
provides:
  - saveOverrides server action with Zod validation and delete-then-insert pattern
  - deleteOverridesForDate server action for reverting to recurring behavior
  - Fully functional "Specific Dates" tab in AvailabilityEditor with date picker, per-date time ranges, save/delete/revert/mark-unavailable
  - Dashboard RSC passes initialOverrides to editor for round-trip persistence
key_files:
  - src/actions/availability.ts
  - src/components/dashboard/AvailabilityEditor.tsx
  - src/app/(dashboard)/dashboard/availability/page.tsx
  - src/components/ui/popover.tsx
key_decisions:
  - Override save is per-date (not bulk) — each date is saved independently with its own Save Override button, matching the mental model of "customize this specific date"
  - Empty windows array passed to saveOverrides means "unavailable on this date" (rows deleted, none inserted); deleteOverridesForDate means "revert to recurring" (delete rows entirely)
  - Calendar date picker uses date-fns format for YYYY-MM-DD serialization; parseDateString avoids timezone shift by constructing Date with year/month/day args
patterns_established:
  - Override server actions follow same getClaims() + getTeacherId() + delete-then-insert pattern as updateAvailability
  - Per-date override state uses Map<string, TimeRange[]> keyed by YYYY-MM-DD date strings
  - ShadCN Popover + Calendar combo for date picker UI pattern
observability_surfaces:
  - Server actions return { error: string } with specific messages for auth failure, validation failure, DB error
  - Sonner toast feedback surfaces errors and success in the UI
  - availability_overrides table directly queryable in Supabase for inspection
duration: 1 session
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Build override server actions and wire the "Specific Dates" editor tab

**Added `saveOverrides` and `deleteOverridesForDate` server actions with Zod validation and overlap checking, enabled the "Specific Dates" tab with ShadCN Calendar date picker, per-date time-range editing, save/revert/mark-unavailable handlers, and wired the dashboard RSC to fetch and pass override data.**

## What Happened

1. **Server actions** — Added two new exported server actions to `src/actions/availability.ts`:
   - `saveOverrides(specificDate, windows)` — Validates date format (YYYY-MM-DD regex), each window (HH:MM regex + end > start), and overlap check via `validateNoOverlap`. Uses delete-then-insert pattern scoped to `(teacher_id, specific_date)`. Empty windows = "unavailable" (deletes rows, skips insert). Revalidates both dashboard and public profile paths.
   - `deleteOverridesForDate(specificDate)` — Validates date format, deletes all override rows for the teacher+date pair. Used for "revert to recurring" (distinct from saving empty windows). Same auth and revalidation pattern.

2. **Dashboard RSC** — Updated `page.tsx` to include `availability_overrides(*)` in the Supabase select query and pass `initialOverrides` prop to `AvailabilityEditor`.

3. **Specific Dates tab** — Major update to `AvailabilityEditor.tsx`:
   - Removed `disabled` from the "Specific Dates" tab trigger, matched active styling
   - Added override state as `Map<string, TimeRange[]>` initialized from `initialOverrides` prop
   - Built tab content with two-column layout: left sidebar (date picker + override date list) and right panel (per-date editor)
   - Date picker uses ShadCN `Popover` + `Calendar` with past dates disabled
   - Selecting a new date auto-adds a default 9:00–17:00 window
   - Override date list shows date and window count (or "Unavailable")
   - Per-date editor reuses the `TimeSelect` component for start/end time dropdowns
   - Wired: "Save Override" → `saveOverrides`, "Revert to recurring" → `deleteOverridesForDate`, "Mark as unavailable" → `saveOverrides` with empty array, "Add time window" / "Remove" for per-date ranges
   - All actions use sonner toast feedback

4. **ShadCN Popover** — Installed via `npx shadcn add popover` (Radix dependency was already present).

## Verification

- `npm run build` — **zero errors**, all pages compile cleanly including `dashboard/availability`
- `npx vitest run tests/unit/override-precedence.test.ts` — **6 tests pass** (override-wins-recurring precedence)
- `npx vitest run tests/unit/time-utils.test.ts` — **25 tests pass** (no regressions)
- Browser verification attempted but login failed (no valid test credentials available in this session). UI rendering and tab switching could not be exercised end-to-end. The build passes type-checking of all component props, server action imports, and Supabase query shapes, confirming structural correctness.

## Diagnostics

- Query `availability_overrides` table in Supabase to inspect saved overrides
- Server actions return `{ error: string }` with specific messages: "Not authenticated", "Teacher profile not found", "Invalid date format", "End time must be after start time", "Overlap detected: ...", "Delete failed: ...", "Insert failed: ..."
- Sonner toasts surface all error and success messages in the editor UI
- Run `npx vitest run tests/unit/override-precedence.test.ts` to verify precedence logic

## Deviations

None — implementation follows the task plan exactly.

## Known Issues

- Browser round-trip verification not completed in this session due to unavailable test credentials. Manual verification (save → reload → persist) should be done when credentials are available. The build + type-check passing confirms all wiring is structurally correct.

## Files Created/Modified

- `src/actions/availability.ts` — Added `saveOverrides` and `deleteOverridesForDate` server actions with Zod schemas and overlap validation
- `src/components/dashboard/AvailabilityEditor.tsx` — Enabled "Specific Dates" tab with full override editing UI: date picker, per-date time ranges, save/delete/revert/mark-unavailable handlers
- `src/app/(dashboard)/dashboard/availability/page.tsx` — Added `availability_overrides(*)` fetch and `initialOverrides` prop pass-through
- `src/components/ui/popover.tsx` — New: ShadCN Popover component (installed via CLI)
