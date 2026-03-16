# S02: Per-Date Override Availability

**Goal:** A teacher can set custom availability for specific future dates (overriding their recurring weekly pattern), and a visitor sees override availability on the teacher's public profile for those dates.
**Demo:** Teacher opens the availability editor → clicks "Specific Dates" tab → picks a future date → adds time ranges → saves. Visiting the teacher's public page on that date shows only the override slots (not the recurring pattern). Removing all time windows for an override date shows "no times available" for that date.

## Must-Haves

- ShadCN Calendar component installed and working for date picker
- "Specific Dates" tab enabled and functional in AvailabilityEditor
- `saveOverrides` server action with `getClaims()` auth, delete-then-insert scoped per `(teacher_id, specific_date)`
- `deleteOverridesForDate` server action to remove all overrides for a specific date
- Dashboard availability RSC fetches and passes `initialOverrides` to editor
- Public profile `[slug]/page.tsx` fetches `availability_overrides` for next 90 days
- `BookingCalendar.getSlotsForDate()` implements override-wins-recurring precedence
- `BookingCalendar.isAvailable()` returns true for dates with overrides even if no recurring slot for that day-of-week
- Override overlap validation reuses `validateNoOverlap` from `src/lib/utils/time.ts`
- Unit tests cover override-wins-recurring precedence logic
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Supabase queries, server actions, React rendering)
- Human/UAT required: no (unit tests + build verify correctness; UAT deferred to S02-UAT.md)

## Verification

- `npx vitest run tests/unit/override-precedence.test.ts` — override-wins-recurring precedence: no override → recurring, override exists → only override, zero-window override → empty slots
- `npx vitest run tests/unit/time-utils.test.ts` — existing 25 tests still pass (no regressions)
- `npm run build` — zero errors, all new components type-check
- Manual verification pattern (for execution tasks): save overrides via editor tab → reload page → overrides persist → visit public profile → override slots shown for that date

## Observability / Diagnostics

- Runtime signals: Server action returns `{ error: string }` on failure with specific messages (auth, validation, DB); success returns `{}`
- Inspection surfaces: `availability_overrides` table directly queryable in Supabase dashboard; editor loads existing overrides on page load for round-trip verification
- Failure visibility: Zod validation errors surface in server action response; Supabase errors propagated to client via `{ error }` return; sonner toast displays errors in editor UI
- Redaction constraints: None — no secrets or PII in availability data

## Integration Closure

- Upstream surfaces consumed: `availability` table + `AvailabilityEditor` (S01), `validateNoOverlap` / `generate5MinOptions` / `formatTimeLabel` from `src/lib/utils/time.ts` (S01), `getClaims()` + delete-then-insert pattern from `src/actions/availability.ts` (S01), `availability_overrides` table from migration `0007` (S01)
- New wiring introduced in this slice: `saveOverrides` + `deleteOverridesForDate` server actions, override date picker + per-date time ranges in AvailabilityEditor "Specific Dates" tab, `overrides` prop threaded from `[slug]/page.tsx` → `BookingCalendar`, override-wins-recurring precedence in `getSlotsForDate()`, `isAvailable()` extended to check override dates
- What remains before the milestone is truly usable end-to-end: S03 (booking calendar slot presentation at 30-min increments within availability windows), S04 (session cancellation)

## Tasks

- [x] **T01: Add ShadCN Calendar component and unit tests for override precedence logic** `est:45m`
  - Why: Calendar component is a hard dependency for the date picker UI. Precedence tests define the correctness target before any feature code exists (test-first).
  - Files: `src/components/ui/calendar.tsx`, `tests/unit/override-precedence.test.ts`
  - Do: Run `npx shadcn@latest add calendar` to install the ShadCN Calendar component. Create `tests/unit/override-precedence.test.ts` with tests for a pure `getSlotsForDate` function covering 3 cases: (a) no override → recurring slots returned, (b) override exists → only override slots, (c) override with zero windows → empty array. Extract the pure logic from `BookingCalendar.tsx`'s `getSlotsForDate` into a testable function in `src/lib/utils/slots.ts`.
  - Verify: `npx vitest run tests/unit/override-precedence.test.ts` — tests exist and define expected behavior (initially failing on override cases is expected since feature code isn't wired yet); `ls src/components/ui/calendar.tsx` confirms Calendar installed
  - Done when: Calendar component exists, slot utility with override precedence extracted and tested, all tests pass

- [x] **T02: Build override server actions and wire the "Specific Dates" editor tab** `est:1h30m`
  - Why: This is the core editor-side work — enables teachers to pick a date, add/remove time ranges, save overrides, and see persisted overrides on page load.
  - Files: `src/actions/availability.ts`, `src/components/dashboard/AvailabilityEditor.tsx`, `src/app/(dashboard)/dashboard/availability/page.tsx`
  - Do: Add `saveOverrides(specificDate, windows[])` and `deleteOverridesForDate(specificDate)` server actions to `src/actions/availability.ts` following `getClaims()` + delete-then-insert pattern scoped per `(teacher_id, specific_date)`. Update dashboard RSC to also fetch `availability_overrides` for this teacher and pass as `initialOverrides` prop. In AvailabilityEditor: remove `disabled` from "Specific Dates" tab trigger, add override state as `Map<string, TimeRange[]>`, build date picker with ShadCN Calendar (disable past dates), render per-date time-range rows reusing existing `TimeSelect`, wire save/delete handlers with sonner toast feedback.
  - Verify: `npm run build` passes; editor tab opens, date picker renders, time ranges can be added — round-trip save/load works against real Supabase
  - Done when: Teacher can open "Specific Dates" tab, pick a date, add time ranges, save, reload, and see persisted overrides; empty windows correctly delete all overrides for that date

- [x] **T03: Wire override data into public profile and BookingCalendar with precedence** `est:1h`
  - Why: This completes the user-facing integration — visitors see override availability when it exists for a date, falling back to recurring otherwise.
  - Files: `src/app/[slug]/page.tsx`, `src/components/profile/BookingCalendar.tsx`, `src/lib/utils/slots.ts`, `tests/unit/override-precedence.test.ts`
  - Do: In `[slug]/page.tsx`, add a second Supabase query fetching `availability_overrides` for the teacher where `specific_date` is within the next 90 days, pass as `overrides` prop to `BookingCalendar`. Update `BookingCalendarProps` to accept `overrides`. Replace the inline `getSlotsForDate` with the extracted utility from `src/lib/utils/slots.ts` that implements override-wins-recurring precedence. Update `availableDays` useMemo and `isAvailable()` to also check override dates set. Ensure override-derived `TimeSlot` objects use `${specific_date}-${startRaw}` as slotId. Verify all precedence tests pass.
  - Verify: `npx vitest run tests/unit/override-precedence.test.ts` — all 3+ cases pass; `npm run build` — zero errors; visiting a teacher's public page shows override slots for dates with overrides and recurring slots for dates without
  - Done when: Public profile correctly shows override-only slots for override dates and recurring slots for all other dates; `isAvailable()` highlights override dates in the calendar; all tests pass; build succeeds

## Files Likely Touched

- `src/components/ui/calendar.tsx` (new — ShadCN add)
- `src/lib/utils/slots.ts` (new — extracted `getSlotsForDate` with override precedence)
- `tests/unit/override-precedence.test.ts` (new — precedence unit tests)
- `src/actions/availability.ts` (add `saveOverrides`, `deleteOverridesForDate`)
- `src/components/dashboard/AvailabilityEditor.tsx` (enable "Specific Dates" tab, date picker, override state)
- `src/app/(dashboard)/dashboard/availability/page.tsx` (fetch `initialOverrides`)
- `src/app/[slug]/page.tsx` (fetch `availability_overrides`, pass to BookingCalendar)
- `src/components/profile/BookingCalendar.tsx` (new `overrides` prop, updated `getSlotsForDate`/`isAvailable`)
