# M004: Availability & Scheduling Overhaul

**Vision:** Teachers control their schedule with 5-minute precision, override specific dates, and cancel sessions with a single click — replacing the rigid 1-hour weekly grid with a flexible, real-life-ready availability system.

## Success Criteria

- A teacher can set availability as time ranges (e.g., 3:30–4:45 PM) in 5-minute increments on any day of the week
- A teacher can set availability for a specific future date that overrides their recurring weekly pattern
- When an override exists for a date, the parent-facing booking calendar shows only the override slots (not recurring)
- An existing teacher's current 1-hour recurring availability is preserved after migration with no data loss
- The parent-facing booking calendar displays bookable time slots derived from the new granularity
- A teacher can cancel an upcoming confirmed session from their dashboard, triggering an immediate cancellation email to the parent
- `npm run build` succeeds with zero errors

## Key Risks / Unknowns

- **Editor UX paradigm shift** — Moving from a click-grid of 1-hour blocks to time-range pickers is a complete component rewrite. If the UX is awkward, teachers won't use it.
- **Override-wins-recurring precedence** — The merge logic (if override rows exist for a date, ignore recurring) must be correct in both the booking calendar and the availability display, or parents see wrong slots.
- **Booking slot presentation at higher granularity** — A 3-hour availability window at 5-min granularity produces 36 possible start times. The parent-facing calendar must present slots sensibly, not as an overwhelming list.

## Proof Strategy

- Editor UX paradigm → retire in S01 by building the real recurring editor with time-range pickers, saving to DB, and loading back correctly
- Override precedence → retire in S02 by implementing real override save/load with precedence logic and verifying on the teacher's public page
- Booking slot presentation → retire in S03 by rendering real bookable slots from the new availability data on the parent-facing calendar

## Verification Classes

- Contract verification: `npm run build`, Vitest unit tests for overlap validation, precedence logic, and timezone conversion of per-date overrides
- Integration verification: Supabase migration applies cleanly, availability saves and loads round-trip through the real DB, booking calendar renders real data from both recurring and override tables
- Operational verification: Production deploy, existing teacher data migrated without loss
- UAT / human verification: Editor usability — setting a 3:30–4:45 window feels fast and intuitive

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices complete with checkboxes marked
- A teacher can set recurring time-range availability with 5-min precision via the redesigned editor
- A teacher can add per-date override availability for a specific future date
- The parent-facing booking calendar correctly shows override slots (when present) or recurring slots
- Existing teacher availability data is intact after migration
- A teacher can cancel an upcoming session from the dashboard, and the parent receives a cancellation email
- `npm run build` passes
- Success criteria re-verified against live behavior on production

## Requirement Coverage

- Covers: AVAIL-04, AVAIL-05, AVAIL-06, AVAIL-07, CANCEL-01
- Partially covers: none
- Leaves for later: none
- Orphan risks: none — all 5 deferred M004 requirements are mapped

### Mapping

| Requirement | Primary Slice | Supporting Slices | Notes |
|---|---|---|---|
| AVAIL-04 (5-min granularity) | S01 | S03 | S01 builds the editor + schema; S03 reflects it in booking calendar |
| AVAIL-05 (per-date overrides) | S02 | S03 | S02 builds override table + editor tab; S03 integrates into booking calendar |
| AVAIL-06 (weeks-in-advance planning) | S02 | — | Per-date overrides enable future-date planning; booking calendar already supports future months |
| AVAIL-07 (redesigned editor UX) | S01 | S02 | S01 replaces the grid with time-range pickers; S02 adds the override date tab |
| CANCEL-01 (last-minute cancellation email) | S04 | — | Self-contained: button + server action + existing email function |

## Slices

- [ ] **S01: Recurring Availability Editor with 5-Min Granularity** `risk:high` `depends:[]`
  > After this: A teacher can open the redesigned availability editor, set time ranges like 3:30–4:45 PM for each day of the week, save, and see them persisted — replacing the 1-hour block grid entirely.
- [ ] **S02: Per-Date Override Availability** `risk:medium` `depends:[S01]`
  > After this: A teacher can switch to a "Specific Dates" tab in the editor, pick a future date, set custom time ranges for that date, and save. The teacher's public profile page shows override availability for that date instead of the recurring pattern.
- [ ] **S03: Booking Calendar Integration** `risk:medium` `depends:[S01,S02]`
  > After this: A parent viewing a teacher's page sees bookable time slots that reflect both recurring availability and per-date overrides with correct precedence — override wins for dates where overrides exist.
- [ ] **S04: Last-Minute Session Cancellation** `risk:low` `depends:[]`
  > After this: A teacher can click "Cancel Session" on a confirmed session card in their dashboard, which cancels the booking and sends an immediate cancellation email to the parent.

## Boundary Map

### S01 → S02

Produces:
- `availability` table unchanged structurally (TIME columns already support 5-min values)
- Redesigned `AvailabilityEditor.tsx` with time-range picker paradigm (start/end dropdowns per day, multiple windows per day)
- `updateAvailability` server action accepting `{ day_of_week, start_time, end_time }[]` with 5-min-aligned HH:MM values
- Overlap validation utility function (sort-and-compare on start_time per day)
- 5-minute time options generator (288 HH:MM strings)

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Recurring availability stored as time ranges (not individual hour blocks) — `start_time` and `end_time` at 5-min granularity
- Same `availability` table schema — downstream queries unchanged structurally

### S02 → S03

Produces:
- `availability_overrides` table: `(id, teacher_id, specific_date, start_time, end_time, created_at)` with `UNIQUE(teacher_id, specific_date, start_time)`
- Override save/delete server actions following existing `getClaims()` auth pattern
- Override-wins-recurring precedence logic: "if any override row exists for date X, use only override rows; ignore recurring for that date"

Consumes:
- S01: time-range editor pattern, overlap validation, 5-min time options generator

### S04 (independent)

Produces:
- "Cancel Session" button on `ConfirmedSessionCard`
- `cancelSession` server action: sets booking status to `cancelled`, calls `sendCancellationEmail(bookingId)`, revalidates paths

Consumes:
- Existing `sendCancellationEmail` in `src/lib/email.ts`
- Existing `ConfirmedSessionCard` component and `startTransition` + server action pattern
