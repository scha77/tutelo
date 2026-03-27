# M007 Research: Capacity & Pricing

**Written:** 2026-03-25  
**Milestone:** M007 — Capacity & Pricing  
**Status:** Ready to plan

---

## Summary

M007 is a medium-complexity milestone building on a mature, well-patterned codebase. All required integration points (Supabase, Stripe, Resend) are already wired and working. The work is additive — new DB tables, new UI sections, two new pricing code paths. The biggest technical risk is the slot-duration interaction when a session type has a locked duration (e.g. 90 min) but the booking calendar generates 30-min slots. This requires a slot-filtering change in `getSlotsForDate` / `generateSlotsFromWindow` that wasn't called out explicitly in the context. The second risk is the booking form state machine, which already has 6 steps (`calendar → form → auth → payment → success → error`) — adding a session-type selector step needs careful placement to avoid breaking the deferred path.

The waitlist and capacity features are architecturally straightforward. The session-type pricing fork in `create-intent` is a clean branch point with very low risk of regression. Backward compatibility (SESS-04) is achievable with a simple null-check on `session_type_id`.

---

## Codebase Map

### Files That Will Be Modified

| File | Why It Changes |
|---|---|
| `supabase/migrations/0011_capacity_and_session_types.sql` | New migration (create) |
| `src/app/[slug]/page.tsx` | Fetch capacity status + session types; conditionally render at-capacity state |
| `src/components/profile/BookingCalendar.tsx` | Session type selector step + slot-duration filter |
| `src/app/api/direct-booking/create-intent/route.ts` | Branch to flat-price if session_type_id present |
| `src/actions/bookings.ts` | `cancelSession` and `markSessionComplete` — trigger waitlist notify after DB update |
| `src/lib/email.ts` | Add `sendWaitlistNotificationEmail()` |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Add CapacitySettings + SessionTypeManager sections |
| `src/lib/schemas/booking.ts` | Add optional `session_type_id` to `BookingRequestSchema` |
| `src/lib/nav.ts` | Potentially add Waitlist nav item (or fold into Students) |

### Files That Will Be Created

| File | What It Is |
|---|---|
| `src/emails/WaitlistNotificationEmail.tsx` | React Email template for waitlist notification |
| `src/components/dashboard/CapacitySettings.tsx` | Capacity limit input component |
| `src/components/dashboard/SessionTypeManager.tsx` | CRUD list for session types |
| `src/components/profile/AtCapacitySection.tsx` | Profile page at-capacity state with waitlist form |

### Files That Must NOT Change

| File | Reason |
|---|---|
| `src/lib/utils/booking.ts` | `computeSessionAmount` is the hourly_rate path — it stays; the session-type path bypasses it |
| `src/lib/utils/slots.ts` | `generateSlotsFromWindow` stays at 30-min increments for the hourly_rate path; a duration-filter overlay handles session-type slot filtering at a higher level |
| `src/app/api/stripe/webhook/route.ts` | No changes to webhook event handling needed for M007 |
| Existing email templates | No changes to existing email components |

---

## Integration Analysis

### Stripe: create-intent fork

The `POST /api/direct-booking/create-intent` route currently:
1. Fetches `teacher.hourly_rate`
2. Calls `computeSessionAmount(startTime, endTime, hourlyRate)`
3. Creates PaymentIntent for that amount

The M007 session-type path must:
1. Accept optional `session_type_id` in the request body
2. If `session_type_id` is present, fetch `session_types` row (verify `teacher_id` matches), use `price * 100` as `amountInCents`
3. If absent, keep existing `computeSessionAmount()` path

**Risk:** The `on_behalf_of` pattern is NOT used (see decision in DECISIONS.md: "Destination charges without on_behalf_of"). The session-type path uses the same charge model — only `amountInCents` changes. The 7% application fee calculation applies identically to both paths.

**Security:** Must validate that `session_types.teacher_id === teacherId` from the request — prevents a parent from substituting another teacher's (cheaper) session type. The route already fetches the teacher row, so this is a one-extra-query check.

**Minimum-amount guard:** `amountInCents < 50` guard already in route — session types with price $0.00 would be caught. Teachers shouldn't set $0 prices but validation should enforce `price >= 1` dollar (100 cents) at the form level.

### Supabase: New Tables

**`session_types` table:**
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
teacher_id     UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE
label          TEXT NOT NULL
price          NUMERIC(10,2) NOT NULL  -- dollars, same convention as hourly_rate
duration_minutes INTEGER NOT NULL    -- locked duration for slot filtering
sort_order     SMALLINT NOT NULL DEFAULT 0
created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

RLS: public `SELECT` (parents need to read on profile page), teacher-gated `INSERT/UPDATE/DELETE` (same subquery pattern as `availability` table).

**`waitlist` table:**
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
teacher_id     UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE
parent_email   TEXT NOT NULL
created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
notified_at    TIMESTAMPTZ  -- NULL = not yet notified
UNIQUE(teacher_id, parent_email)  -- prevent duplicate waitlist entries
```

RLS: **Anonymous `INSERT`** (the waitlist signup form is unauthed — parents don't have accounts). Teacher-gated `SELECT` and `DELETE` (dashboard management). No `UPDATE` needed — `notified_at` is stamped by service-role `supabaseAdmin` in the notification code path.

**`capacity_limit` column on `teachers`:**
```sql
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS capacity_limit SMALLINT; -- nullable = unlimited
```

RLS is inherited from the existing `teachers_public_read` and `teachers_update_own` policies — no new policies needed.

### Active Student Count Query

The profile page RSC must compute whether the teacher is at capacity. The query pattern mirrors `students/page.tsx` but uses `confirmed` + `completed` status and a 90-day window:

```sql
SELECT COUNT(DISTINCT student_name) as active_students
FROM bookings
WHERE teacher_id = $teacherId
  AND status IN ('confirmed', 'completed')
  AND booking_date >= NOW() - INTERVAL '90 days'
```

This is a simple enough query to do inline (not an RPC). It only runs when `capacity_limit IS NOT NULL`.

**Edge case:** The `student_name` deduplication key is a plain text string, same as the students page pattern. Two students named "Alex Johnson" booked by different parents count as one — this is an accepted MVP limitation already documented in the context.

### Waitlist Notification Trigger Points

Currently `cancelSession` in `src/actions/bookings.ts`:
1. Cancels the Stripe PaymentIntent
2. Updates booking status to `cancelled`
3. Fires `sendCancellationEmail` (fire-and-forget)
4. Fires `sendSmsCancellation` (fire-and-forget)

M007 adds after step 4:
5. Fire `checkAndNotifyWaitlist(teacherId)` (fire-and-forget)

`checkAndNotifyWaitlist` logic:
1. Fetch `teacher.capacity_limit` — if null, skip
2. Re-count active students (same 90-day confirmed/completed query)
3. If `active_students < capacity_limit` → fetch all unnotified waitlist entries
4. Blast email to all, stamp `notified_at = NOW()` via `supabaseAdmin`

Same pattern applies to `markSessionComplete` — though capacity technically goes up when a session completes (the 90-day window ages them out, not at session-complete time). This is the nuance: completing a session doesn't immediately free a slot — the student remains "active" until 90 days elapse. The notification should only fire on **cancellation** events where a `confirmed` booking is removed, genuinely reducing the active count. The context says "on cancellation or session completion events" — this needs clarification during planning:

**Candidate Clarification (for planner):** Session completion does NOT free capacity under the 90-day window model. Triggering `checkAndNotifyWaitlist` on `markSessionComplete` would re-check capacity but would never find capacity freed (the student is still active). The notification should only trigger on `cancelSession`. Including it on `markSessionComplete` is harmless (no-op) but wastes a DB query. Recommend: trigger only on `cancelSession`.

### BookingCalendar: Session Type Selector Placement

The current step machine: `calendar → form → auth → payment → success / error`

Session type selection must happen **before** slot selection when session types exist, because the locked `duration_minutes` on the selected session type constrains which time slots are valid. A 90-min session type can only start at slots where 90 minutes fit within the teacher's availability window.

**Proposed step insertion:**
```
session_type (if session types exist) → calendar → form → auth → payment → success / error
```

Alternatively, session type selector can live in the form step (after calendar and slot selection), with a duration override that works retroactively. But this creates a UX problem: the parent picks a 30-min slot then selects "SAT Prep (90 min)" — now the end time is wrong.

**Recommendation:** Add a `session_type` step before `calendar`. When a session type with a locked duration is selected, `getSlotsForDate` is called with a modified duration. Since `generateSlotsFromWindow` already generates N-minute slots dynamically (the slot size is the `SLOT_DURATION_MS` constant = 30 min), the cleanest approach is to filter out slots where `startRaw + duration_minutes` exceeds the availability window end, not change `getSlotsForDate` itself.

**Implementation approach:** After calling `getSlotsForDate` (which always returns 30-min slots), apply a client-side filter: for each slot, check if `startRaw + selectedSessionType.duration_minutes` fits within the availability window. The `endRaw` on each `TimeSlot` will need to be overridden to reflect the locked duration.

This is the highest-complexity UI change in M007. The `BookingCalendar.tsx` already has ~400 lines — the session type additions will push it toward 550+ lines. Consider extracting subcomponents (SessionTypeStep, SlotPanel) but that's a style choice.

**Deferred path (non-Stripe connected):** The session type selector must also work on the deferred path (`submitBookingRequest` server action). The `BookingRequestSchema` will need `session_type_id` as an optional field. The deferred path doesn't compute a payment amount at booking time, so `session_type_id` is informational only — it should be stored on the booking row for future reference.

**Consideration:** `bookings` table currently has a `subject` column (NOT NULL). When a session type is selected, what populates `subject`? Use the session type `label` as the subject. This preserves backward compatibility and avoids a nullable `subject` column change.

### Email: WaitlistNotificationEmail

Pattern follows `CancellationEmail.tsx` exactly — React Email, same container styling, same `Resend` import in `email.ts`. Props needed:
```tsx
{
  teacherName: string
  bookingLink: string  // https://tutelo.app/[slug]
  parentEmail: string  // for unsubscribe context (MVP: informational only)
}
```

The "unsubscribe affordance" from the context can be a plain text note at the bottom ("You're receiving this because you joined the waitlist for [teacher]. Reply to this email to unsubscribe.") — no actual unsubscribe endpoint needed at MVP.

---

## Risk Assessment

### Risk 1: Session type duration + slot generation (HIGH — must prove first)

The slot generation system (`generateSlotsFromWindow`) uses a hardcoded 30-minute `SLOT_DURATION_MS`. A 90-min session type needs to show only slots where 90 minutes of availability exist from that start time. The solution requires a filter pass after slot generation, not a change to `SLOT_DURATION_MS` (which would break the hourly_rate path).

**Proof point:** A unit test that takes a 3-hour availability window (08:00–11:00), applies a 90-min session type filter, and confirms only 4 slots appear (08:00, 08:30, 09:00, 09:30) rather than 6 (last two would run past 11:00).

### Risk 2: BookingCalendar state machine complexity (MEDIUM)

The calendar is already a 400-line client component handling 6 steps. Adding a session-type pre-step means new state (`selectedSessionType`, `sessionTypes` prop), new prop threading from the RSC, and modified slot filtering logic. The component is not tested (only todos), so regressions are possible.

**Mitigations:** Add the session type selector as a conditional block at the top of the `calendar` step (shown when session types exist and none is selected yet) rather than a new named step. This minimizes step machine changes. The session type is just another piece of `form` state once selected.

**Alternative:** Keep current step machine, move session type selector into the `form` step but validate before advancing to `auth/payment`. Duration filtering becomes a prop to `getSlotsForDate`. Simpler state machine but awkward UX (parent sees calendar first, then has to re-choose if their slot doesn't fit the session type duration).

### Risk 3: RLS for anonymous waitlist INSERT (LOW — well-established pattern)

Anonymous inserts already work for bookings (`bookings_anon_insert WITH CHECK (true)`). Same pattern applies to waitlist. The UNIQUE constraint `(teacher_id, parent_email)` prevents spam-level duplicate entries.

### Risk 4: Capacity count race condition (LOW — acceptable)

The `at-capacity` check runs in the RSC at page render time. A concurrent booking could cause two parents to see "not at capacity" simultaneously and both book. The existing `bookings_unique_slot` constraint prevents double-booking the same slot, but doesn't prevent the capacity count from exceeding the limit. At MVP scale this is acceptable — the context explicitly calls this out.

### Risk 5: Settings page data growth (LOW)

The settings page already renders `AccountSettings` + `SchoolEmailVerification`. Adding `CapacitySettings` + `SessionTypeManager` makes it a long page. UX concern only — no technical risk. Could use a tabbed layout, but sections with `<hr>` separators are simpler and match existing patterns.

---

## Existing Patterns to Reuse

| Pattern | Where Used | How M007 Uses It |
|---|---|---|
| Fire-and-forget email | `cancelSession`, `markSessionComplete` | `checkAndNotifyWaitlist` |
| `supabaseAdmin` for write-from-action | `markSessionComplete`, `cancelSession` | Stamping `notified_at` on waitlist entries |
| Teacher-gated RLS via subquery | `availability`, `availability_overrides` | `session_types` write policy |
| Anonymous INSERT with `WITH CHECK (true)` | `bookings_anon_insert` | `waitlist_anon_insert` |
| React Email template | All email templates in `src/emails/` | `WaitlistNotificationEmail` |
| `sonner` toast for settings actions | `AccountSettings` | `CapacitySettings`, `SessionTypeManager` |
| `useTransition` for server action form | `AccountSettings` | `CapacitySettings` |
| `NUMERIC(10,2)` for dollar amounts | `teachers.hourly_rate` | `session_types.price` |
| Cents conversion at PaymentIntent creation | `create-intent/route.ts` | Same location, session-type price path |
| `it.todo()` stubs for upcoming tests | All test files | New test files for capacity + session type logic |

---

## Natural Slice Boundaries

### Slice 1: Schema + Capacity Foundation
**Delivers:** Migration `0011`, `capacity_limit` on teachers, active-student count query, at-capacity state on profile page (UI only — no waitlist yet), CapacitySettings dashboard component.

**Proves:** Migration applies cleanly, capacity check query correct, profile page shows at-capacity state when limit is reached, teachers without limits are unaffected.

**Why first:** This is the shared schema that the other two slices depend on. The waitlist table can go here too since the profile page needs to show the waitlist form.

### Slice 2: Waitlist (Join + Dashboard + Notifications)
**Delivers:** `waitlist` table (in migration), anonymous waitlist signup form on at-capacity profile page, teacher waitlist dashboard (view + remove), `sendWaitlistNotificationEmail`, `checkAndNotifyWaitlist` trigger in `cancelSession`.

**Depends on:** Slice 1 (capacity check, at-capacity profile state, `waitlist` table).

**Proves:** Parent can join waitlist, teacher sees it in dashboard, cancellation triggers email blast to all waitlisted parents.

### Slice 3: Session Types (CRUD + Booking Flow + Stripe)
**Delivers:** `session_types` table (in migration), SessionTypeManager dashboard component, session type selector in BookingCalendar, slot-duration filtering, `create-intent` fork to flat-price, backward compatibility (SESS-04).

**Depends on:** Slice 1 schema migration (migration must be a single file so all three tables land together, but session_types work can proceed in parallel with Slice 2 after the migration is confirmed).

**Proves:** Teacher can create session types, parent sees selector on profile page, Stripe PaymentIntent uses flat price, hourly_rate path unchanged.

**Risk:** Highest complexity of the three slices due to slot-duration filtering and BookingCalendar state changes. Should be started early even if Slice 2 completes first.

---

## Migration Consolidation

All three slices touch the DB, but there should be only **one migration file**: `0011_capacity_and_session_types.sql`. It adds:
1. `capacity_limit` column on `teachers`
2. `waitlist` table + RLS
3. `session_types` table + RLS

This is cleaner than splitting into 0011/0012/0013 — the tables are all inert until the application code uses them. Running a single migration reduces deployment risk.

**Implication for slice planning:** S01 owns and ships the migration. S02 and S03 read from tables added in S01's migration without adding their own migrations. All application code changes in S02 and S03 are behind feature flags implicit in whether `capacity_limit IS NOT NULL` or `session_types` has rows.

---

## Requirements Analysis

### All 9 Requirements Are In-Scope

CAP-01, CAP-02, WAIT-01, WAIT-02, WAIT-03, SESS-01, SESS-02, SESS-03, SESS-04 — all well-specified, with clear DB schema mappings and UI attachment points. No scope creep detected.

### Missing / Underspecified Behaviors

**WAIT-02 scope clarification needed:** The requirement says "Teacher sees waitlist in dashboard and can manually open spots." Does "manually open spots" mean reducing `capacity_limit` (changing the number), or something else? Based on context, it means viewing waitlisted emails and removing entries — not adjusting the limit per se. The dashboard component should offer: list view of waitlisted parents, and a "Remove" action per entry. A "Remove all" or "Notify now" button is a deferred idea.

**WAIT-03 notification deduplication:** Once `notified_at` is stamped, those parents won't be re-notified on subsequent capacity-free events. This is correct behavior (first-come-first-served) but should be explicitly documented in the implementation.

**SESS-01 duration options:** The context says `duration_minutes` is "locked per type." What values are valid? Recommend: dropdown with pre-set values (30, 45, 60, 75, 90, 120 minutes) matching natural tutoring session lengths. Free-form input risks teachers entering 7 minutes. This is agent-discretion territory per the context.

**SESS-02 + subject field:** When a session type is selected, `bookings.subject` (NOT NULL) must be populated. Use the session type `label` as the subject — no schema change needed.

**Backward compatibility check (SESS-04):** Teachers without session types must hit zero changed behavior. The critical path: `session_types` table is empty → `create-intent` receives no `session_type_id` → falls back to `computeSessionAmount` exactly as today. This is a simple null-check. The profile page RSC must not break if `session_types` query returns an empty array.

### Candidate Requirements (Advisory — Not Auto-Binding)

1. **SESS-05 (candidate): Session type price validation** — Enforce minimum price of $1 (100 cents) at the form level, to prevent bypassing the Stripe 50-cent minimum. Currently only caught at PaymentIntent creation. Recommend: zod validation in SessionTypeManager that rejects prices below 1.00.

2. **WAIT-04 (candidate): Duplicate waitlist entry prevention** — The `UNIQUE(teacher_id, parent_email)` constraint silently swallows duplicate inserts (Postgres returns an error, not a duplicate row). The UI should show a friendly "You're already on the waitlist" message rather than a generic error. This is a UX-level detail, not a new table, but worth calling out.

3. **CAP-03 (candidate): At-capacity visibility when teacher has no availability** — Currently, a teacher with no availability shows "hasn't set availability yet." When at capacity, the profile page hides the calendar. These two states may conflict: if teacher has both `capacity_limit` reached AND no availability, the at-capacity state should take precedence (shows waitlist form). The RSC logic needs to handle this ordering explicitly.

---

## What Should Be Proven First

1. **The single migration lands cleanly** — all three new tables exist, RLS is correct, `capacity_limit` column is additive. This unblocks everything else.

2. **The active-student count query is correct** — unit test with known booking data: 3 confirmed bookings from same student within 90 days = 1 active student; 1 booking outside 90-day window = 0 active students.

3. **The session-type slot-duration filter works** — pure function test (no React render needed): given a 3-hour availability window and a 90-min session type, verify correct slot count and correct `endRaw` values.

4. **create-intent session-type fork is correct** — unit test: session_type_id present → uses `session_types.price × 100`; absent → uses `computeSessionAmount()`. No actual Stripe API calls in tests (mock pattern is already established).

5. **BookingCalendar session type selector renders correctly and backward-compatibility path unchanged** — existing `it.todo` stubs in `booking-calendar.test.tsx` should be implemented. New tests for session-type selector step.

---

## Skill Discovery

No new technology is introduced in M007. All dependencies already exist in the codebase:
- Supabase (tables, RLS, queries) — used since M001
- Stripe PaymentIntents — used since M004  
- Resend / React Email — used since M002
- Next.js App Router RSC + Server Actions — established patterns throughout
- Vitest — existing test framework

No skills research needed. Existing patterns are directly reusable.

---

## Key Constraints the Planner Must Know

1. **Single migration file `0011`** — all three feature tables land together. S01 owns it.

2. **`computeSessionAmount` must not be modified** — the hourly_rate path is protected. Session-type path runs parallel.

3. **`bookings.subject` is NOT NULL** — session type `label` becomes the subject value when a session type is selected; no schema change.

4. **`BookingCalendar.tsx` is a 400-line client component** — session type additions must be surgical. The deferred (non-Stripe) path must still work after changes.

5. **`cancelSession` is the primary notification trigger** — not `markSessionComplete` (completing a session doesn't free capacity under the 90-day window model).

6. **Anonymous waitlist INSERT** — follows the `bookings_anon_insert` pattern exactly. No auth required for joining a waitlist.

7. **`capacity_limit IS NULL` = unlimited** — every check in application code must handle the null case as "no limit, always show booking calendar."

8. **`session_type.price` stored in dollars as `NUMERIC(10,2)`** — multiply by 100 to get cents at PaymentIntent creation, same as `hourly_rate` convention.

9. **No new cron jobs** — waitlist notifications are synchronous fire-and-forget in the request that causes the capacity change. This matches the existing `sendCancellationEmail` pattern.

10. **Dashboard nav** — WAIT-02 (teacher views waitlist) can live as a section within the settings page or as a new "Waitlist" view. Given it's a simple table with delete action, embedding in settings is lower friction than a new nav item.
