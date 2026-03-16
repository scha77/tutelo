# S01: Recurring Availability Editor with 5-Min Granularity — Research

**Date:** 2026-03-11

## Summary

S01 is a complete rewrite of `AvailabilityEditor.tsx` (158 lines, 1-hour toggle grid → per-day time-range pickers) plus a Supabase migration adding the `availability_overrides` table. The DB schema change for the `availability` table itself is **zero-cost** — Postgres `TIME` columns already accept `HH:MM` values at any granularity, and the existing `updateAvailability` server action already uses `HH:MM` format. The real work is entirely in the editor UX.

The new editor paradigm: each day of the week shows a list of time-range rows (start dropdown + end dropdown), with an "Add window" button to support split schedules (e.g., 8–11 AM + 3–5 PM). This is far more usable than 288 toggle buttons per day. The ShadCN `Select` component (already in `src/components/ui/select.tsx`) and `Button` are the only UI primitives needed — no new component installs. The `Tabs` primitive from `radix-ui` (already installed: `import { Tabs } from 'radix-ui'`) enables the Recurring/Override tab layout for S02; S01 only builds the Recurring tab, but the tab shell should be scaffolded now to avoid a disruptive refactor in S02.

The `availability_overrides` table (needed by S02 but scaffolded as a migration in S01 to keep schema work together) is a pure additive migration — no existing data is touched. The key constraint is `UNIQUE(teacher_id, specific_date, start_time)`, mirroring the existing `UNIQUE(teacher_id, day_of_week, start_time)` on `availability`.

## Recommendation

**Build in this order within S01:**

1. **Migration** — add `availability_overrides` table (additive, safe, S02-ready)
2. **`generate5MinOptions()` utility** — 288 `HH:MM` strings, extracted to `src/lib/utils/time.ts` for reuse in S02
3. **Overlap validation utility** — `validateNoOverlap(windows: {start_time, end_time}[])` pure function in same file, unit-testable
4. **New `AvailabilityEditor.tsx`** — per-day time-range UI with Add/Remove window, Save button, tab shell (Recurring tab active, Override tab disabled/placeholder for S02)
5. **Update `updateAvailability` server action** — extend Zod schema to validate `end_time > start_time` (already handles HH:MM format); the delete-then-insert pattern is unchanged
6. **Vitest unit tests** — for `generate5MinOptions` and `validateNoOverlap`

The `availability` table page on `/dashboard/availability` already loads and passes `initialSlots` correctly — no changes needed to the RSC page.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Time dropdowns | ShadCN `Select` in `src/components/ui/select.tsx` | Already installed; `SelectTrigger`/`SelectContent`/`SelectItem` pattern matches existing usage in `BookingCalendar.tsx` |
| Tab switching (Recurring / Override) | `Tabs` from `radix-ui` (same package as all other primitives) | `import { Tabs } from 'radix-ui'` — no install needed; identical to `Select` pattern in `select.tsx` |
| Delete-then-insert save | `updateAvailability` in `src/actions/availability.ts` | Pattern is correct; only Zod schema needs `end_time > start_time` validation |
| Auth in server action | `getClaims()` pattern in `updateAvailability` | Already correct for availability actions; don't switch to `getUser()` — that's only for layout auth |
| Toast notifications | `sonner` (already used in `AvailabilityEditor.tsx`) | Keep the same `toast.success` / `toast.error` pattern |
| 5-min time array | Generate inline: `Array.from({length: 288}, (_, i) => ...)` | No library needed — extract to `src/lib/utils/time.ts` for reuse |

## Existing Code and Patterns

- `src/components/dashboard/AvailabilityEditor.tsx` — 158-line 1-hour toggle grid. **Replace entirely.** The `useTransition` + `startTransition(async () => {...})` save pattern must be preserved. The `AvailabilityEditorProps` interface stays the same (`initialSlots: AvailabilitySlot[]`).
- `src/actions/availability.ts` — delete-then-insert with `getClaims()`. The `AvailabilitySlotSchema` Zod object needs a refinement: `.refine(s => s.end_time > s.start_time, 'end_time must be after start_time')`. The overall action signature is unchanged.
- `src/app/(dashboard)/dashboard/availability/page.tsx` — RSC that fetches `teacher.availability(*)` and passes to `AvailabilityEditor`. **No changes needed** — the prop shape stays the same.
- `src/components/ui/select.tsx` — ShadCN Select with `SelectTrigger`, `SelectContent`, `SelectItem`. Use for all time dropdowns. Existing usage: `BookingCalendar.tsx` subject dropdown.
- `src/components/profile/AvailabilityGrid.tsx` — normalizes DB `HH:MM:SS` to `HH:MM` with `.slice(0, 5)`. The new editor stores `HH:MM` on save; the grid's normalization is defensive and correct as-is.
- `src/lib/utils/timezone.ts` — uses fixed reference Monday (2025-01-13) for timezone conversion. The recurring availability path is unchanged. Per-date overrides (S02) will use actual dates directly, not this reference-Monday trick.
- `src/components/dashboard/ConfirmedSessionCard.tsx` — "Mark Complete" button uses `startTransition` → server action → `toast`. **S04 reference pattern** — not in S01 scope but good to note for later.

## Constraints

- **`availability` table schema is unchanged** — `TIME NOT NULL` columns already support 5-min values (`08:30`, `16:45` etc). The unique constraint `UNIQUE(teacher_id, day_of_week, start_time)` is preserved; the delete-then-insert pattern handles it correctly.
- **`Tabs` from `radix-ui` is `@radix-ui/react-tabs` re-exported** — confirmed: `import * as reactTabs from '@radix-ui/react-tabs'; export { reactTabs as Tabs }`. Usage: `import { Tabs } from 'radix-ui'`, then `<Tabs.Root>`, `<Tabs.List>`, `<Tabs.Trigger>`, `<Tabs.Content>`. No shadcn wrapper file needed unless you want custom styling.
- **`getClaims()` required, not `getUser()`** — per DECISIONS.md, server actions under the dashboard layout must use `getClaims()`. The existing `updateAvailability` already does this correctly.
- **Overlap validation must be application-level** — the DB unique constraint only catches duplicate `start_time` for same day, not overlapping ranges like `08:00–10:00` + `09:00–11:00`. Sort by `start_time` and check `windows[i].end_time > windows[i+1].start_time`.
- **Zod v4 uses `.issues` not `.errors`** — per DECISIONS.md. Already handled correctly in existing `updateAvailability`.
- **No new UI library installs** — all needed primitives (`Select`, `Button`, `Tabs`, `Label`) are already installed via `radix-ui@1.4.3`.
- **`revalidatePath('/[slug]', 'page')` in `updateAvailability`** — must be preserved; ensures availability changes appear on teacher's public page immediately.
- **date-fns v4 installed** — some import paths may differ from v3. The existing codebase uses `addDays`, `format`, `isSameDay`, etc. correctly. Don't introduce new date-fns imports that weren't already in use unless verified.

## Common Pitfalls

- **Empty-state save** — if a teacher removes all windows for a day, the `slots` array for that day will be empty. The server action must treat this as valid (delete all rows for that day, insert nothing). This is already how the current delete-then-insert works — don't add a "must have at least one slot" check.
- **`HH:MM` vs `HH:MM:SS`** — Postgres returns `HH:MM:SS` from `TIME` columns. The `initialSlots` passed to `AvailabilityEditor` will have `start_time: "08:00:00"` format. The editor must `.slice(0, 5)` to normalize to `HH:MM` when initializing state from `initialSlots`. Existing `AvailabilityGrid.tsx` already does this correctly.
- **Select dropdown with 288 options** — rendering 288 `SelectItem` elements is not a problem at this scale (it's a short list rendered in a portal). But grouping by hour (e.g., optgroup-style labels "8 AM", "9 AM") will dramatically improve usability. Consider rendering hour headers in the dropdown.
- **`end_time` must be strictly after `start_time`** — not just different. A window of `08:00–08:00` must be rejected. The Zod refinement should use `>` comparison on the HH:MM string (lexicographic comparison works correctly for 24-hour HH:MM format).
- **Tab shell scaffolding for S02** — scaffolding a disabled "Specific Dates" tab in S01 is the right call to avoid a disruptive refactor in S02. But the Override tab content should render `null` or a placeholder — don't import anything from S02's not-yet-built code.
- **Multiple windows per day state management** — the state shape changes from a `Set<string>` (current) to `Map<number, {start_time: string, end_time: string}[]>` (7 days → array of windows). Initializing this map from `initialSlots` requires grouping by `day_of_week`. Use `useMemo` to derive initial state from `initialSlots` prop correctly.
- **`updateAvailability` validates each slot independently** — with multiple windows per day, flat-mapping all windows across all days before passing to `updateAvailability` is correct. The action receives a flat array of `{day_of_week, start_time, end_time}` — same as before.

## Open Risks

- **Booking granularity vs availability granularity (DECIDED)** — per DECISIONS.md, "Booking calendar presents slots at 30-min booking increments within availability windows." S01 doesn't touch `BookingCalendar.tsx` — this decision lands in S03. S01 just needs to store time ranges correctly.
- **`SELECT` dropdown performance with 288 options** — if the radix `Select` virtualizes, fine. If not, there may be a paint delay on first open. Grouping by hour (12 groups of 24) reduces perceived list length and mitigates this. Acceptable risk for MVP.
- **`availability_overrides` migration in S01 vs S02** — the roadmap places overrides in S02, but the DB migration is safer to run in S01 (additive, no data risk, gets it out of the way). If the decision changes, the migration can be deferred — it's purely additive either way.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase + Postgres | `supabase/agent-skills@supabase-postgres-best-practices` | Available (34.9K installs) — relevant for `availability_overrides` migration design |
| shadcn/ui | `shadcn/ui@shadcn` | Available (19.2K installs) — useful if adding new shadcn primitives (Tabs wrapper); not strictly needed since Radix is used directly |

## Sources

- `src/components/dashboard/AvailabilityEditor.tsx` — current 1-hour toggle grid; state shape, save pattern, slot key format
- `src/actions/availability.ts` — `getClaims()` auth pattern, Zod schema, delete-then-insert, `revalidatePath` calls
- `src/app/(dashboard)/dashboard/availability/page.tsx` — RSC data fetch pattern; `teacher.availability(*)` select
- `src/components/ui/select.tsx` — ShadCN Select primitive (used for time dropdowns)
- `src/components/profile/BookingCalendar.tsx` — `getSlotsForDate()` slot rendering; `HH:MM:SS` slice normalization; existing slot flow this slice feeds into (S03)
- `src/components/profile/AvailabilityGrid.tsx` — `HH:MM:SS` → `HH:MM` normalization via `.slice(0, 5)`; reference Monday timezone conversion
- `src/lib/utils/timezone.ts` — fixed reference Monday approach; `convertSlotToTimezone()` (recurring path, unchanged by S01)
- `src/components/dashboard/ConfirmedSessionCard.tsx` — `startTransition` + server action pattern (reference for S04)
- `supabase/migrations/0001_initial_schema.sql` — `availability` table: `UNIQUE(teacher_id, day_of_week, start_time)`; RLS policies pattern
- `package.json` — confirmed: `radix-ui@1.4.3` (has `Tabs`), `date-fns@4.1.0`, `zod@4.3.6`, `sonner` (via shadcn)
- `node_modules/radix-ui/dist/index.d.ts` — confirmed `Tabs` re-exported from `@radix-ui/react-tabs`
- `.gsd/DECISIONS.md` — `getClaims()` vs `getUser()` for server actions; Zod v4 `.issues`; delete-then-insert pattern; separate `availability_overrides` table decision; time-range picker paradigm decision
