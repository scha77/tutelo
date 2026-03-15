# M004: Availability & Scheduling Overhaul — Context

**Gathered:** 2026-03-11
**Status:** Pending (depends on M003)

## Project Description

Tutelo's availability system currently uses 1-hour blocks on a recurring weekly schedule (Sun–Sat, 8am–9pm). Teachers cannot set precise windows, cannot override specific dates, and cannot plan weeks ahead. This milestone rebuilds the availability system to support 5-minute granularity, per-date overrides, weeks-in-advance planning, and a completely redesigned editor UX. It also adds a last-minute cancellation notification flow (email).

## Why This Milestone

Teachers have varied schedules — a 3:30–4:45 tutoring window doesn't fit into 1-hour blocks. They also need to handle real-life variability: "I'm free next Tuesday but not the following Tuesday because of a school event." The current system forces teachers into a rigid weekly pattern that doesn't reflect how their time actually works. Flexible availability → more bookings → more revenue → platform stickiness.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Set availability in 5-minute increments (e.g., 3:30–4:45 PM)
- Set availability for specific future dates, overriding their recurring weekly pattern
- Plan and publish their schedule weeks in advance
- Use an intuitive, visually clear editor that makes setting hours fast and pleasant
- Send a last-minute cancellation notification to a parent via email with a single action from the dashboard

### Entry point / environment

- Entry point: https://tutelo.app/dashboard/availability
- Environment: Vercel production
- Live dependencies: Supabase (schema changes, migration), Resend (cancellation email)

## Completion Class

- Contract complete means: `npm run build` succeeds, migrations apply cleanly, existing availability data migrated
- Integration complete means: availability editor saves and loads 5-min slots, per-date overrides work, booking calendar reflects new granularity, cancellation email sends
- Operational complete means: deployed to production, existing teacher availability migrated without data loss

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A teacher can set a 3:30–4:45 PM availability window on a specific future date
- A parent viewing the teacher's page sees that specific date/time available for booking
- An existing teacher's current 1-hour recurring slots still work correctly after migration
- A teacher can send a last-minute cancellation email to a parent from the dashboard

## Risks and Unknowns

- **Schema migration complexity** — Changing from 1-hour recurring to 5-min + per-date requires careful migration of existing data. Must not lose any teacher's current availability.
- **Booking calendar UX** — The parent-facing calendar must gracefully handle the increased slot density (288 possible 5-min slots per day vs. 14 hour blocks).
- **Timezone edge cases with per-date overrides** — Specific dates cross timezone boundaries differently than recurring weekly patterns.

## Existing Codebase / Prior Art

- `supabase/migrations/0001_initial_schema.sql` — `availability` table: `teacher_id`, `day_of_week`, `start_time` (TIME), `end_time` (TIME)
- `src/components/dashboard/AvailabilityEditor.tsx` — 158 lines, 1-hour block grid
- `src/components/profile/BookingCalendar.tsx` — Parent-facing calendar with slot display
- `src/actions/availability.ts` — Delete-then-insert pattern for slot replacement

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- AVAIL-04 — 5-minute granularity
- AVAIL-05 — Per-date availability overrides
- AVAIL-06 — Weeks-in-advance planning
- AVAIL-07 — Redesigned availability editor UX
- CANCEL-01 — Last-minute cancellation notification (email)

## Scope

### In Scope

- New availability schema supporting 5-min granularity and per-date overrides
- Migration of existing availability data
- Redesigned availability editor component
- Updated parent-facing booking calendar to show new slot types
- Last-minute cancellation flow (dashboard action → cancellation email to parent)
- New cancellation email template

### Out of Scope / Non-Goals

- SMS cancellation (M005 — CANCEL-02)
- Teacher verification (M005)
- Any UI polish or animation work (M003)
- Recurring booking automation

## Technical Constraints

- Must maintain backward compatibility during migration — no teacher loses availability
- `TIME` column pattern may need to change for 5-min granularity (HH:MM:SS already supports it, but the editor rounds to hours)
- Per-date overrides need a new table or an expanded schema
- Booking calendar must still respect timezone conversion (AVAIL-03, already validated)

## Open Questions

- **Per-date override schema** — New `availability_overrides` table vs. extending `availability` table with an optional `specific_date` column?
- **Editor UX pattern** — Drag-to-select time ranges? Click-and-drag? Dropdown pickers? Research during planning.
- **Cancellation flow** — Cancel from the session card on /dashboard? Or from /dashboard/requests? Both?
