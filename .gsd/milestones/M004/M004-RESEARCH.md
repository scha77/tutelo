# M004: Availability & Scheduling Overhaul — Research

**Date:** 2026-03-11

## Summary

The existing availability system is a thin recurring-weekly grid: one row per (teacher, day_of_week, start_time) in the `availability` table, with hour-precision TIME columns and a delete-then-insert save pattern. The DB already stores `HH:MM:SS` TIME values — Postgres `TIME` natively supports 5-minute granularity — so the *schema change for AVAIL-04 is almost zero-cost*. The real work is the UX: 288 possible 5-minute slots per day is unusable as a click-grid. The right UX pattern here is a time-range picker (start time + end time per day), not individual slot toggles. That maps to a small number of availability windows per day rather than a sea of buttons.

The biggest architectural decision is AVAIL-05 (per-date overrides). Two clean options exist: (a) a separate `availability_overrides` table with a `specific_date DATE NOT NULL` column alongside the same time fields, or (b) adding an optional `specific_date DATE` column to the existing `availability` table with a partial unique index. Option (a) is strongly preferred: it keeps the recurring and override query paths separated, avoids nullable-primary-key confusion in the unique constraint, and makes the migration forward and backward transparent. The `availability_overrides` table can be `LEFT JOIN`'d or union'd in the booking calendar with clear precedence semantics: overrides win over recurring when both match a specific date.

The cancellation flow (CANCEL-01) is 90% already built. `sendCancellationEmail()` exists in `src/lib/email.ts`, `CancellationEmail.tsx` template exists, and the function is already wired to the auto-cancel cron. What's missing is a teacher-initiated trigger: a "Cancel Session" button on the `ConfirmedSessionCard` that marks the booking `cancelled`, fires `sendCancellationEmail()`, and invalidates the sessions page. The implementation pattern is identical to `markSessionComplete` — a server action or API route with auth guard, status update, email dispatch, and `revalidatePath`.

## Recommendation

**Prove schema first, UX second, cancellation last.** The schema migration (new `availability_overrides` table + widening the editor to time-range windows) is the riskiest part and touches the most downstream surfaces. Build it in a slice that can be tested against the live DB before touching the parent-facing `BookingCalendar`. The cancellation feature is self-contained and low-risk — save it for the final slice so earlier slices remain focused.

For the editor UX, use a **time-range input pattern per day**: a start-time and end-time dropdown/picker for each day of the week (and for override dates). This is far more usable than 5-minute toggle grids and matches how teachers actually think ("I'm free Tuesday 3:30–5:00 and Thursday 4:00–6:00"). The recurring tab handles normal weeks; a second "Specific dates" tab handles overrides. ShadCN already provides Select, Input, and Popover components — no new UI library needed.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Time-zone-aware time display | `date-fns-tz` (already installed: `formatInTimeZone`, `toDate`) | Already used correctly in `BookingCalendar`, `AvailabilityGrid`, `timezone.ts`; same patterns must be followed for per-date overrides |
| 5-minute time options | Generate programmatically in-component (e.g., `Array.from({length:288}, ...)`) | No library needed — this is a simple array of HH:MM strings at 5-min intervals |
| Override-wins-recurring precedence logic | Custom query in the data-fetch layer (SQL `UNION` or application-level merge) | Standard scheduling pattern — application-level merge is more readable than complex SQL |
| Transactional save of availability | Supabase delete-then-insert in `updateAvailability` server action | Already implemented; extend the same pattern to overrides |
| Cancellation email | `sendCancellationEmail(bookingId)` in `src/lib/email.ts` | 100% complete — just needs a teacher-initiated trigger |
| Email templating | React Email + Resend (`@react-email/components`, `resend`) | Already wired; `CancellationEmail.tsx` is the template to reuse/extend for last-minute cancellation |

## Existing Code and Patterns

- `src/components/dashboard/AvailabilityEditor.tsx` — 158-line 1-hour toggle grid. **Replace entirely**: the whole component switches to a per-day time-range picker paradigm. Keep the `updateAvailability` server action interface shape (array of `{ day_of_week, start_time, end_time }`) for recurring slots.
- `src/actions/availability.ts` — delete-then-insert server action with Zod validation. Extend to handle both recurring (existing table) and override (new table) saves. The `updateAvailability` function signature will need a second param or a separate action for overrides.
- `src/components/profile/BookingCalendar.tsx` — Parent-facing calendar. `getSlotsForDate()` filters by `day_of_week` only. This function must be extended to accept both recurring slots and date-specific override slots, with override-wins precedence.
- `src/components/profile/AvailabilityGrid.tsx` — Weekly availability display on teacher profile. Uses the same `day_of_week` slots. Will need a parallel path for override-date display (or a combined view).
- `src/app/[slug]/page.tsx` — Fetches `teacher.availability(*)` via Supabase join. Will need to also fetch `availability_overrides` for a date range (e.g., next 90 days) to populate the booking calendar.
- `src/lib/email.ts` → `sendCancellationEmail(bookingId)` — Already complete. Called from `auto-cancel` cron. Needed as-is for CANCEL-01; just needs a new server action or API route handler to call it teacher-side.
- `src/components/dashboard/ConfirmedSessionCard.tsx` — Has "Mark Complete" button. The "Cancel Session" button for CANCEL-01 follows the same `startTransition` → server action → `toast` pattern. Add alongside the existing button.
- `src/emails/CancellationEmail.tsx` — Generic "booking cancelled" template. Works for last-minute teacher-initiated cancellation. The `isTeacher` flag already differentiates messaging. May want a second template variant with "Teacher cancelled" messaging to parent; or pass a `reason` prop.
- `src/lib/utils/timezone.ts` → `convertSlotToTimezone()` — Handles timezone conversion for recurring weekly slots. Per-date overrides don't need the reference-Monday trick — they can use the actual specific date directly.
- `supabase/migrations/0001_initial_schema.sql` — `availability` table: `UNIQUE(teacher_id, day_of_week, start_time)`. The new `availability_overrides` table will have `UNIQUE(teacher_id, specific_date, start_time)` as its constraint.
- `src/lib/schemas/booking.ts` — `startTime` and `endTime` already validate `HH:MM` format, which is correct for 5-min slots. No schema change needed for the booking side.

## Constraints

- **`TIME` columns already support 5-min granularity** — Postgres `HH:MM:SS` works with `08:30`, `16:45`, etc. The `availability` table requires no column type change for AVAIL-04. The constraint is the *editor UI*, not the DB.
- **`availability_unique` is `UNIQUE(teacher_id, day_of_week, start_time)`** — Overlapping time windows for the same day will not be caught by this constraint. Application-level validation must prevent overlapping ranges.
- **Server action auth bug (Next.js 16)** — Per DECISIONS.md: server actions under the dashboard layout fail auth on POST re-renders. The existing `updateAvailability` uses `getClaims()` (not `getUser()`), consistent with other availability actions. **The new override save action must follow the same auth pattern.** Any new cancellation action that needs strong auth identity should use `getUser()` or the API route handler pattern (see DECISIONS.md: "connectStripe converted to POST /api/connect-stripe API route handler").
- **`bookings.start_time` unique constraint is `(teacher_id, booking_date, start_time)`** — This already handles 5-min bookings correctly since it's keyed on the actual date, not day_of_week. No change needed.
- **Timezone conversion for per-date overrides** — Unlike recurring slots (which use a reference Monday for math stability), per-date overrides can and should use the actual specific_date for timezone conversion. This is simpler and more accurate.
- **The booking calendar currently queries `availability(*)` in one join** — Adding per-date overrides requires a second query or a SQL function. The `[slug]/page.tsx` fetch will need updating. For the date range, fetch overrides for the next 90 days (or the visible calendar range).
- **`revalidatePath('/[slug]', 'page')` in `updateAvailability`** — Must be preserved and extended so that availability changes appear immediately on the teacher's public page.
- **`date-fns` v4 is installed** — Some API changes from v3 may apply (e.g., `nextDay` import path). Verify with existing usage patterns in `timezone.ts`.

## Common Pitfalls

- **Overlapping time windows** — With range-based input, teachers can create `08:00–10:00` and `09:00–11:00`. The editor must validate no overlap before save. Simple sort-and-compare on start_time catches this.
- **Override precedence ambiguity** — "If teacher has recurring Wednesday 3–5pm AND an override for next Wednesday 3–6pm, what shows?" Answer: override wins entirely for that specific date. This must be implemented as: if any override row exists for that date, use *only* the override rows; ignore recurring rows for that date.
- **`end_time` on availability with 5-min granularity** — The current editor hardcodes `end_time = start_time + 1 hour`. With ranges, end_time is user-provided. Must validate `end_time > start_time`. Also: sessions booking against a 3:30–4:45 window — what's the session duration? Currently the booking just records the slot's start/end. This is fine as-is.
- **Slot density in BookingCalendar** — A teacher with 3:00–6:00 availability in 5-min granularity would show 36 time-slot buttons. The current `TimeSlotButton` renders one button per slot. For 5-min granularity, slots should either be shown as a single range button ("3:00 PM – 6:00 PM") or broken into logical chunks (e.g., 30-min booking increments). The booking granularity question must be answered before the parent-facing calendar is built.
- **The `availability_unique` constraint will reject duplicate start_times** — If a teacher saves `Mon 3:00–5:00` and later saves `Mon 4:00–6:00` without deleting the first, the unique constraint fires. The delete-then-insert pattern handles this correctly by wiping all recurring rows for the teacher before inserting fresh, but it must be applied atomically per table (not mixing recurring + override deletes).
- **Migration data loss** — Existing recurring slots use 1-hour granularity. The migration must not delete them. Adding the new `availability_overrides` table is additive (no risk). The `availability` table is unchanged structurally. Data is safe.
- **`getClaims()` vs `getUser()`** — Per DECISIONS.md, `getClaims()` is the pattern used in `updateAvailability`. Continue using it for new availability server actions. For the cancellation action (which may trigger payment-adjacent logic), check if `getUser()` is needed.
- **`sendCancellationEmail` uses `supabaseAdmin`** — It fetches booking + teacher data as service role. This is correct for fire-and-forget email dispatch. Don't refactor it to use the user's session client.
- **Booking calendar slot rendering for 5-min precision** — The `getSlotsForDate()` function currently creates one `TimeSlot` per `AvailabilitySlot` row. With per-date overrides, this logic must be updated to: (1) check for override rows for the specific date, (2) if found, use only those; (3) if not found, use recurring rows for that day_of_week.

## Open Risks

- **Booking granularity vs availability granularity** — If the teacher sets 3:30–4:45 PM availability, what duration session can a parent book? The current booking model doesn't enforce session duration — it just records start/end from the slot. If a teacher has a 5-min-granular window, does the parent pick arbitrary start/end times, or does Tutelo enforce a minimum session duration (e.g., 30 min, 1 hour)? This must be decided before the booking calendar UX is built. **Candidate requirement not currently in scope: minimum session duration per teacher.**
- **Weeks-in-advance planning UI** — AVAIL-06 says "plan weeks ahead." The booking calendar already supports this (parents can click any future month). For teachers, the override tab in the editor just needs to allow picking future dates. No separate "weeks-ahead" feature is needed — it's implied by per-date overrides.
- **How far ahead should overrides be fetchable?** — Fetching 90 days of overrides is a reasonable default. Must decide the query window when loading the booking calendar.
- **Last-minute cancellation: which entry point?** — Context mentions both `/dashboard` (sessions page) and `/dashboard/requests`. The confirmed sessions are on `/dashboard/sessions` via `ConfirmedSessionCard`. That's the natural entry point — teachers see upcoming sessions there and can cancel from the card. The `/dashboard/requests` page handles `requested` (not `confirmed`) bookings.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase + Postgres | `supabase/agent-skills@supabase-postgres-best-practices` (34.9K installs) | Available — relevant for new table migration design |
| Resend / React Email | `resend/resend-skills@resend` (3.4K installs) | Available — useful if email template patterns need review |
| React Email templates | `resend/react-email@react-email` (3.1K installs) | Available — useful for new last-minute cancellation template variant |

## Sources

- Codebase: `src/components/dashboard/AvailabilityEditor.tsx` — current 1-hour grid implementation
- Codebase: `src/actions/availability.ts` — delete-then-insert pattern, auth pattern
- Codebase: `src/components/profile/BookingCalendar.tsx` — `getSlotsForDate()` function, slot rendering
- Codebase: `src/components/profile/AvailabilityGrid.tsx` — recurring slot display and timezone conversion
- Codebase: `src/lib/email.ts` — `sendCancellationEmail()`, existing email dispatch patterns
- Codebase: `src/emails/CancellationEmail.tsx` — existing cancellation template
- Codebase: `supabase/migrations/0001_initial_schema.sql` — `availability` table schema, constraints
- Codebase: `.gsd/DECISIONS.md` — Next.js 16 server action auth bug, `getUser()` vs `getClaims()`, delete-then-insert availability pattern, API route handler pattern for auth-sensitive actions
- Codebase: `src/lib/utils/timezone.ts` — reference-Monday approach for recurring slot timezone conversion
