# S03 Research: Session Types + Variable Pricing

**Written:** 2026-03-26  
**Slice:** S03 — Session Types + Variable Pricing  
**Depth:** Targeted — well-established patterns, but BookingCalendar state machine changes require precision

---

## Summary

S03 is the final slice of M007. All infrastructure is already in place: the `session_types` DB table was scaffolded in migration 0011 (S01), the `SessionTypeManager.tsx` UI component and `session-types.ts` server action are already written and fixed (S02), `generateSlotsFromWindow` / `getSlotsForDate` now accept an optional `durationMinutes` parameter with 16 passing tests (S02 forward intelligence), and the `cancelSession` → `checkAndNotifyWaitlist` hook is wired (S02). The worktree is in a clean state (153 unit tests pass, tsc clean, build green after S02).

**What S03 must build:**
1. Wire `SessionTypeManager` into the settings page (+ fetch session_types from DB)
2. Extend `BookingCalendar` to accept `sessionTypes` prop, add session type selector (before slot selection), filter slots by `duration_minutes`, and pass `session_type_id` to `create-intent`
3. Extend `create-intent` route to fork: flat price when `session_type_id` present, hourly_rate path unchanged
4. Extend `BookingRequestSchema` with optional `session_type_id`
5. Wire `session_types` fetch into the profile page RSC and pass to `BookingCalendar`
6. Unit tests: create-intent flat-price fork + session-type `subject` population

**Nothing to create from scratch.** The component and action are pre-written. The slot utility is pre-extended. S03 is pure wiring + BookingCalendar additions + create-intent fork.

---

## What S01/S02 Already Delivered (Forward Intelligence)

| Asset | Location | S03 Consumes |
|---|---|---|
| `session_types` table + RLS | migration 0011 | Already live — read-only SELECT for profile page, teacher-gated CUD |
| `SessionTypeManager.tsx` component | `src/components/dashboard/SessionTypeManager.tsx` | Wire into settings page |
| `addSessionType` / `updateSessionType` / `deleteSessionType` actions | `src/actions/session-types.ts` | Already correct, S02 fixed Zod `.errors → .issues` bug |
| `generateSlotsFromWindow(durationMinutes?)` | `src/lib/utils/slots.ts` | Pass `selectedSessionType.duration_minutes` |
| `getSlotsForDate(durationMinutes?)` | `src/lib/utils/slots.ts` | Pass to `timeSlotsForDay` useMemo |
| 16 variable-duration slot tests | `tests/unit/slots-variable.test.ts` | Already pass — no changes needed to slots.ts |
| `WaitlistNotificationEmail` + `sendWaitlistNotificationEmail` | S02 | No S03 changes needed |
| `checkAndNotifyWaitlist` in `cancelSession` | S02 | No S03 changes needed |

---

## Implementation Landscape

### 1. Settings Page — SessionTypeManager Wiring
**File:** `src/app/(dashboard)/dashboard/settings/page.tsx`

Currently renders: `AccountSettings` → `CapacitySettings` → `SchoolEmailVerification`. 

S03 must:
- Fetch `session_types` for the teacher: `supabase.from('session_types').select('id, label, price, duration_minutes, sort_order').eq('teacher_id', teacher.id).order('sort_order')`
- Import and render `<SessionTypeManager sessionTypes={sessionTypes ?? []} />` between `CapacitySettings` and `SchoolEmailVerification`

**Note:** The settings page currently queries `teacher_id: userId` — but `userId` is the Supabase auth UID, not the teachers table ID. The existing bookings query has a bug: it queries `eq('teacher_id', userId)` where userId is the auth UID, not the teacher's UUID. This works only if the RLS on bookings maps user_id → teacher correctly. For session_types, the query must use `teacher.id` (the teachers table PK). The settings page already fetches `teacher` via `.eq('user_id', userId)` — need to also select `id` from the teacher row, then use `teacher.id` for the session_types query.

**Current settings page teacher select:** `'full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone, phone_number, sms_opt_in, verified_at, capacity_limit'` — `id` is NOT selected. Must add `id` to the select list.

### 2. Profile Page RSC — Session Types Fetch
**File:** `src/app/[slug]/page.tsx` (worktree version)

Currently fetches: teacher data + availability, overrides, reviews, capacity check. 

S03 must add:
```ts
const { data: sessionTypes } = await supabase
  .from('session_types')
  .select('id, label, price, duration_minutes, sort_order')
  .eq('teacher_id', teacher.id)
  .order('sort_order')
```

Then pass `sessionTypes={sessionTypes ?? []}` to `<BookingCalendar>`.

### 3. BookingCalendar — Session Type Selector + Slot Filtering
**File:** `src/components/profile/BookingCalendar.tsx`

The calendar is 400 lines, 6-step state machine: `calendar | form | auth | payment | success | error`.

**Approach (minimize state machine changes):**
Add `selectedSessionType` state and show a session type selector panel **before** the date/slot in the `calendar` step, conditionally when `sessionTypes.length > 0` and no session type is selected yet. Once selected, proceed to the normal calendar/slot flow with `duration_minutes` applied.

**Specific changes needed:**

1. **New props:**
   ```ts
   sessionTypes?: Array<{
     id: string
     label: string
     price: number | string
     duration_minutes: number | null
   }>
   ```

2. **New state:**
   ```ts
   const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null)
   ```

3. **`timeSlotsForDay` useMemo** — pass duration to `getSlotsForDate`:
   ```ts
   const duration = selectedSessionType?.duration_minutes ?? undefined
   return getSlotsForDate(selectedDate, slots, teacherTimezone, visitorTimezone, overrides, duration)
   ```
   `getSlotsForDate` already accepts the optional `durationMinutes` param. No changes to slots.ts needed.

4. **Calendar step guard** — when `sessionTypes.length > 0` and `!selectedSessionType`, show the session type selector panel instead of the calendar grid. Once a type is selected, render the calendar normally.

5. **`handleBookAnother` reset** — reset `selectedSessionType` to null alongside other state.

6. **`form.subject`** — when session type selected, use `sessionType.label` as the subject field value (preserves the NOT NULL constraint on bookings.subject). When `subjects.length > 1` with no session types, existing subject dropdown applies as before.

7. **`createPaymentIntent`** — include `sessionTypeId` in the POST body when a session type is selected:
   ```ts
   body: JSON.stringify({
     ...existing fields...,
     sessionTypeId: selectedSessionType?.id ?? undefined,
   })
   ```

8. **Button disabled check** — when session types exist and none selected, "Continue to Payment" should be gated. But this gating already happens because the form step is never reached until a session type is selected (step guard above).

9. **Price display** — in the `form` step header or as a `<p>` under the slot display: show `$XX — Label` when a session type is selected. This replaces/supplements the subject field.

**Subject field interaction:** When `sessionTypes.length > 0`, the subject dropdown should be **hidden** (session type label populates subject). The `subjects.length > 1` condition currently shows the dropdown — add `sessionTypes.length === 0` guard. This is critical for SESS-04 backward compatibility: teachers without session types still see the subject dropdown.

**Deferred path compatibility:** The `submitAction` call (deferred path) also needs `session_type_id` passed — add to the data object. `BookingRequestSchema` needs `session_type_id` as optional (see below). `create_booking` RPC doesn't take session_type_id (bookings table doesn't have a `session_type_id` column in the current schema). The context says "stored on the booking row for future reference" — this requires a schema column. **Decision needed:** either skip storing `session_type_id` on the deferred path (it's informational only and the RPC doesn't accept it), or store it via a post-insert update (like phone number). At MVP, since the deferred path is for non-Stripe-connected teachers who won't have session-type pricing anyway, it's acceptable to pass `session_type_id` informational only and not store it in the DB (no migration needed). The `subject` field uses the session type label — this is sufficient for the deferred path.

### 4. Create-Intent Route — Session Type Pricing Fork
**File:** `src/app/api/direct-booking/create-intent/route.ts`

Current flow: fetches `teacher.hourly_rate` → `computeSessionAmount()` → PI creation.

S03 adds a branch before step 5 (PI creation):

```ts
// Destructure sessionTypeId from body (new)
const { ..., sessionTypeId } = body

// After teacher fetch, add session type fetch if present
let amountInCents: number
if (sessionTypeId) {
  const { data: sessionType } = await supabaseAdmin
    .from('session_types')
    .select('id, price, teacher_id')
    .eq('id', sessionTypeId)
    .single()
  
  // Security: verify session type belongs to this teacher
  if (!sessionType || sessionType.teacher_id !== teacherId) {
    return new Response('Invalid session type', { status: 400 })
  }
  
  amountInCents = Math.round(Number(sessionType.price) * 100)
} else {
  amountInCents = computeSessionAmount(startTime, endTime, teacher.hourly_rate ?? 0)
}
```

The `< 50` guard, `applicationFeeAmount`, and PI creation are identical for both paths.

**Booking insert** — add `session_type_id` to the insert if present. The `session_types` table is already created, but `bookings` table doesn't have a `session_type_id` FK column. **This requires a decision:** 

Option A: Skip storing `session_type_id` on bookings — the price is already captured on the Stripe PaymentIntent metadata. For MVP, this is acceptable.

Option B: Add a `session_type_id` column via a new migration (0012). The research doc says M007 context "stores session_type_id on the booking row for future reference."

**Recommendation:** Add a nullable `session_type_id UUID REFERENCES session_types(id) ON DELETE SET NULL` column to bookings in a new migration `0012_bookings_session_type_id.sql`. This is a clean additive migration. The `subject` field remains NOT NULL (populated from session type label), so no schema conflicts. The PaymentIntent metadata already has `booking_id` — but having `session_type_id` on the booking row enables future reporting/analytics.

However, the M007 context says "Migration must be additive — no destructive changes." A new 0012 is additive. The alternative is keeping migration 0011 as-is and adding the column there (but 0011 is already complete and applied). A new file `0012_bookings_session_type_id.sql` is the clean approach.

**Alternative if no migration:** Store `session_type_id` in PI metadata (`metadata: { ..., session_type_id: sessionTypeId }`). This avoids a migration but loses the DB FK. At MVP scale this is acceptable.

**Final recommendation:** Add `session_type_id` to PI metadata as a lightweight audit trail. Skip the booking table column migration — SESS-03 is about getting the right price through Stripe, not about full DB normalization of session types on bookings. If needed later, it's an easy additive migration.

### 5. BookingRequestSchema Extension
**File:** `src/lib/schemas/booking.ts`

Add: `session_type_id: z.string().uuid().optional()`

This is needed if the deferred path sends `session_type_id` in the submit data. Since we're not storing it in the DB for the deferred path, it's passed through `submitBookingRequest` but currently there's no column to write it to. The schema extension is still needed to avoid validation rejection.

---

## Key Unknowns Resolved

**Q: Does `duration_minutes = null` on a session type mean "use default 30-min slots"?**  
Yes. `generateSlotsFromWindow` defaults to 30 when `durationMinutes` is undefined. Passing `undefined` (from `selectedSessionType?.duration_minutes ?? undefined`) correctly falls through to the default. Teachers can create session types without locking a duration — parent still sees 30-min slots.

**Q: What subject value goes on the booking when a session type is selected?**  
The session type `label` is used as the `subject` field. Preserves NOT NULL constraint. The existing form state `form.subject` is pre-populated with `selectedSessionType.label` when a type is selected. The subject dropdown is hidden.

**Q: Does the deferred path need session type pricing?**  
No. The deferred path is for non-Stripe-connected teachers. Session types with flat pricing only matter for the direct booking path (Stripe PI). The deferred path's `submitBookingRequest` records the session type label as `subject` — that's sufficient.

**Q: What does the slot panel show when a session type with locked duration is selected?**  
Only slots where the full duration fits in the availability window. `getSlotsForDate` with `durationMinutes=90` returns slots like `08:00 – 09:30`, `09:30 – 11:00` (the `endRaw` is now 90 minutes later, not 30). The `TimeSlotButton` only shows `slot.startDisplay` — the end time shown in the form header is `slot.endDisplay` which is already correctly computed by `generateSlotsFromWindow` with the passed duration.

---

## Risk Assessment

**LOW overall.** All infrastructure is pre-built. The two medium-complexity items:

1. **BookingCalendar session type selector (MEDIUM):** The state machine adds one conditional pre-step. The `timeSlotsForDay` useMemo change is a one-liner (add duration param). The session type selector UI is a simple list of cards/buttons (same pattern as `TimeSlotButton`). The subject field hide/show is a `sessionTypes.length === 0` guard. Risk: regression in the existing flow if state reset or subject handling is wrong. Mitigation: the calendar step guard approach (show selector instead of calendar when types exist and none selected) is simpler than adding a new step.

2. **Create-intent session type fork (LOW):** Clean branch point. The `supabaseAdmin` fetch pattern is already in the route. The security check (verify `session_type_id.teacher_id === teacherId`) is a simple equality check on the fetched row.

**No new infrastructure needed.** No new files to create. No migration needed unless we decide to add `session_type_id` to bookings (optional).

---

## Files Modified in S03

| File | Change |
|---|---|
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Add `id` to teacher select; fetch `session_types`; render `SessionTypeManager` |
| `src/app/[slug]/page.tsx` | Fetch session_types; pass as prop to BookingCalendar |
| `src/components/profile/BookingCalendar.tsx` | Add `sessionTypes` prop, `selectedSessionType` state, session type selector pre-step, slot duration filter, `session_type_id` in createPaymentIntent body, subject pre-population, subject dropdown guard |
| `src/app/api/direct-booking/create-intent/route.ts` | Destructure `sessionTypeId`; branch to flat price when present; security check; store in PI metadata |
| `src/lib/schemas/booking.ts` | Add `session_type_id: z.string().uuid().optional()` |

## Files NOT Modified in S03

| File | Reason |
|---|---|
| `src/lib/utils/slots.ts` | Already extended with `durationMinutes` param in S02 — DO NOT TOUCH |
| `src/lib/utils/booking.ts` | `computeSessionAmount` stays for hourly_rate fallback path — DO NOT TOUCH |
| `src/components/dashboard/SessionTypeManager.tsx` | Already complete — just import and render |
| `src/actions/session-types.ts` | Already complete (S02 fixed the Zod bug) — DO NOT TOUCH |
| `src/lib/email.ts` | No changes needed for S03 |
| `src/actions/bookings.ts` | S02 already wired waitlist notifications — DO NOT TOUCH |
| Migration 0011 | Already applied — DO NOT MODIFY |

## Files Potentially Created in S03

- `supabase/migrations/0012_bookings_session_type_id.sql` — **Optional.** Adds nullable `session_type_id` FK to bookings. Recommended to skip for MVP; store in PI metadata instead.

---

## Verification Strategy

```bash
# From .gsd/worktrees/M007

# 1. Variable-duration slot tests (pre-existing, must still pass)
npx vitest run tests/unit/slots-variable.test.ts

# 2. New unit tests for create-intent fork
# test file: tests/unit/session-type-pricing.test.ts
# - session_type_id present → flat price used (mock supabaseAdmin, mock Stripe)
# - session_type_id absent → computeSessionAmount path used
# - session_type_id with wrong teacher_id → 400 response
# - session_type price $60 → amountInCents = 6000

# 3. TypeScript clean
npx tsc --noEmit

# 4. Full build
npm run build
```

The session type selector in BookingCalendar is a client component — no unit test required beyond tsc + build. The create-intent fork is the testable logic unit.

---

## Natural Task Breakdown for Planner

| Task | Scope | Risk |
|---|---|---|
| T01 | Settings page wiring (add `id` to teacher select, fetch session_types, render SessionTypeManager) + profile RSC session_types fetch + BookingRequestSchema extension | LOW — pure wiring |
| T02 | BookingCalendar: sessionTypes prop, session type selector pre-step, slot duration filter, subject field guards, createPaymentIntent body extension | MEDIUM — state machine additions |
| T03 | Create-intent route fork (sessionTypeId → flat price branch, security check, PI metadata) + unit tests + tsc + build | LOW — clean branch point |

T01 and T03 are independent. T02 depends on T01 (needs sessionTypes prop wired into profile RSC before BookingCalendar can be tested). T03 is pure server-side and independent of T01/T02.

Optimal order: T03 first (proves pricing fork works in isolation), then T01 (wires display infrastructure), then T02 (integrates everything in the UI).
