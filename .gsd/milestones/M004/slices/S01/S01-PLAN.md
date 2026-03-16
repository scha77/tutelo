# S01: Recurring Availability Editor with 5-Min Granularity

**Goal:** Replace the 1-hour toggle grid availability editor with a time-range picker paradigm supporting 5-minute granularity, multiple windows per day, and round-trip persistence through the existing `availability` table.
**Demo:** A teacher opens `/dashboard/availability`, sees per-day time-range rows with start/end dropdowns, adds a 3:30–4:45 PM window for Monday, saves, reloads the page, and sees the saved window preserved. The old grid UI is gone.

## Must-Haves

- `generate5MinOptions()` utility producing 288 `HH:MM` strings, extracted to `src/lib/utils/time.ts`
- `validateNoOverlap()` pure function in the same file, rejecting overlapping time ranges per day
- New `AvailabilityEditor.tsx` with per-day time-range rows (start dropdown + end dropdown), "Add window" button, "Remove" button per row
- Tab shell scaffolded with Recurring tab active and Override tab disabled (placeholder for S02)
- `updateAvailability` server action Zod schema validates `end_time > start_time`
- `initialSlots` (with `HH:MM:SS` from Postgres) normalized to `HH:MM` when initializing editor state
- Empty-state save works (teacher removes all windows → saves → no availability stored)
- Supabase migration adding `availability_overrides` table (additive, S02-ready)
- Vitest unit tests for `generate5MinOptions` and `validateNoOverlap`
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Supabase migration + server action round-trip)
- Human/UAT required: no (build + unit tests + manual browser verification by agent)

## Verification

- `npx vitest run tests/unit/time-utils.test.ts` — all unit tests pass for `generate5MinOptions` and `validateNoOverlap`
- `npm run build` — zero errors (TypeScript + Next.js compilation)
- Browser verification: navigate to `/dashboard/availability`, confirm time-range editor renders, save round-trips correctly

## Observability / Diagnostics

- Runtime signals: `toast.error` / `toast.success` in editor on save outcome; server action returns `{ error?: string }` with Zod validation messages
- Inspection surfaces: Supabase `availability` table — query `SELECT * FROM availability WHERE teacher_id = X` to verify saved ranges; editor UI shows current state from `initialSlots` prop
- Failure visibility: Zod validation errors surfaced as `result.error` string from server action; overlap validation errors shown as toast before save attempt
- Redaction constraints: none (no secrets in availability data)

## Integration Closure

- Upstream surfaces consumed: `src/app/(dashboard)/dashboard/availability/page.tsx` (RSC fetches `teacher.availability(*)` and passes `initialSlots`); `src/actions/availability.ts` (server action); `src/components/ui/select.tsx` (ShadCN Select primitive)
- New wiring introduced in this slice: Redesigned `AvailabilityEditor.tsx` with time-range paradigm; `src/lib/utils/time.ts` utility module; `availability_overrides` table migration (consumed by S02)
- What remains before the milestone is truly usable end-to-end: S02 (per-date override editor + precedence logic), S03 (booking calendar integration with new granularity), S04 (session cancellation)

## Tasks

- [x] **T01: Create time utilities and unit tests** `est:30m`
  - Why: Establishes the pure-function foundation (`generate5MinOptions`, `validateNoOverlap`) that both the editor and S02 consume, with test coverage that defines correct behavior upfront
  - Files: `src/lib/utils/time.ts`, `tests/unit/time-utils.test.ts`
  - Do: Create `generate5MinOptions()` returning 288 `HH:MM` strings from `00:00` to `23:55`. Create `validateNoOverlap(windows)` that sorts by `start_time`, rejects `end_time <= start_time`, and detects overlapping ranges. Write comprehensive unit tests covering edge cases (adjacent ranges OK, overlapping rejected, empty array valid, midnight boundary).
  - Verify: `npx vitest run tests/unit/time-utils.test.ts` — all tests pass
  - Done when: Both utility functions exported and all unit tests green

- [x] **T02: Add availability_overrides migration and update server action validation** `est:30m`
  - Why: The DB migration is additive and safe to ship early (S02-ready). The server action needs `end_time > start_time` Zod validation to enforce the new time-range contract.
  - Files: `supabase/migrations/0007_availability_overrides.sql`, `src/actions/availability.ts`
  - Do: Create migration adding `availability_overrides` table with columns `(id UUID PK, teacher_id UUID FK, specific_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`, unique constraint on `(teacher_id, specific_date, start_time)`, RLS policies matching `availability` table pattern. Add Zod `.refine()` on `AvailabilitySlotSchema` to reject `end_time <= start_time` (lexicographic comparison works for `HH:MM`).
  - Verify: Migration file has valid SQL syntax. `npm run build` passes. Server action correctly rejects `end_time <= start_time`.
  - Done when: Migration file exists with correct schema + RLS. Server action validation updated.

- [x] **T03: Build the recurring availability editor with time-range pickers** `est:1h30m`
  - Why: This is the core deliverable — replacing the 1-hour toggle grid with the new per-day time-range UI. Includes tab shell for S02, save round-trip via existing server action, and state initialization from `initialSlots`.
  - Files: `src/components/dashboard/AvailabilityEditor.tsx`
  - Do: Complete rewrite. Initialize state as `Map<number, {start_time, end_time}[]>` grouped from `initialSlots` (normalize `HH:MM:SS` → `HH:MM` via `.slice(0,5)`). Render 7 day sections, each with a list of time-range rows (ShadCN `Select` for start/end with 5-min options grouped by hour), "Add window" and "Remove" buttons. Scaffold `Tabs` shell from `radix-ui` (Recurring active, "Specific Dates" disabled). Run client-side `validateNoOverlap` before save. Flat-map all windows to `{day_of_week, start_time, end_time}[]` and pass to `updateAvailability`. Preserve `useTransition` + `startTransition` + `toast` pattern.
  - Verify: `npm run build` passes. Browser: editor loads existing availability, adding/removing windows works, save persists and reload shows saved data.
  - Done when: Teacher can set time ranges like 3:30–4:45 PM per day, save, reload, and see them. Old grid is gone. Build clean.

## Files Likely Touched

- `src/lib/utils/time.ts` (new)
- `tests/unit/time-utils.test.ts` (new)
- `supabase/migrations/0007_availability_overrides.sql` (new)
- `src/actions/availability.ts` (modified — Zod refinement)
- `src/components/dashboard/AvailabilityEditor.tsx` (complete rewrite)
