# S03: Session Types + Variable Pricing

**Goal:** Teachers create session types with custom prices in dashboard settings. Parents see a session type selector on the profile page before choosing a time slot. Stripe PaymentIntent uses the session-type flat price. Teachers without session types see unchanged booking flow.
**Demo:** After this: Teacher creates session types (e.g. 'SAT Prep $60 / 90 min', 'Homework Help $35 / 60 min') in dashboard settings. Parent visits profile, selects a session type, sees only slots where the locked duration fits, picks a time, and Stripe PaymentIntent is created for the flat session-type price. Teacher with no session types sees unchanged booking flow with subject selector and hourly_rate proration.

## Tasks
- [x] **T01: Extended create-intent API with session type flat-price fork, teacher ownership security check, and 8 unit tests covering all pricing paths** — Extend the create-intent API route to accept an optional `sessionTypeId` in the request body. When present, fetch the session type from `session_types` table via `supabaseAdmin`, verify it belongs to the teacher (security check), and use its `price` as the flat amount in cents. When absent, fall back to the existing `computeSessionAmount` hourly_rate path. Add `session_type_id` to PI metadata. Also extend `BookingRequestSchema` with optional `session_type_id`. Write unit tests covering: flat-price path, hourly-rate fallback, wrong-teacher security rejection, and correct amount calculation.

**Requirements advanced:** SESS-03 (Stripe payment intent uses session-type price), SESS-04 (backward compat — hourly_rate path unchanged when no session type)
  - Estimate: 45m
  - Files: src/app/api/direct-booking/create-intent/route.ts, src/lib/schemas/booking.ts, tests/unit/session-type-pricing.test.ts
  - Verify: npx vitest run tests/unit/session-type-pricing.test.ts && npx tsc --noEmit
- [ ] **T02: Wire SessionTypeManager into settings page + fetch session types in profile RSC** — Two wiring changes:

**Settings page** (`src/app/(dashboard)/dashboard/settings/page.tsx`):
1. Add `id` to the teacher select string (currently missing — needed to query session_types by teacher.id)
2. After the teacher query, fetch session_types: `supabase.from('session_types').select('id, label, price, duration_minutes, sort_order').eq('teacher_id', teacher.id).order('sort_order')`
3. Import `SessionTypeManager` from `@/components/dashboard/SessionTypeManager`
4. Render `<SessionTypeManager sessionTypes={sessionTypes ?? []} />` between `CapacitySettings` and `SchoolEmailVerification`

Note: The existing bookings query uses `eq('teacher_id', userId)` where userId is the auth UID. For session_types, we must use `teacher.id` (the teachers table PK from the `id` we just added to select). The teacher object's `.id` field is the UUID PK, not the auth UID.

**Profile page** (`src/app/[slug]/page.tsx`):
1. After the reviews query, fetch session_types: `supabase.from('session_types').select('id, label, price, duration_minutes, sort_order').eq('teacher_id', teacher.id).order('sort_order')`
2. Pass `sessionTypes={sessionTypes ?? []}` as a new prop to `<BookingCalendar>` (the component will accept this prop after T03, but TypeScript won't error because T03 adds the prop — for now just pass it and the type will be resolved when T03 is done)

**Requirements advanced:** SESS-01 (session type management in settings), SESS-02 (session types data pipeline to profile page)
  - Estimate: 30m
  - Files: src/app/(dashboard)/dashboard/settings/page.tsx, src/app/[slug]/page.tsx
  - Verify: npx tsc --noEmit 2>&1 | head -20
- [ ] **T03: BookingCalendar session type selector, slot duration filtering, and backward-compat guards** — Extend `BookingCalendar` to support session types. This is the main UI integration task.

**Props:**
Add optional `sessionTypes` prop to `BookingCalendarProps`:
```ts
sessionTypes?: Array<{
  id: string
  label: string
  price: number | string
  duration_minutes: number | null
  sort_order: number
}>
```

**State:**
Add `selectedSessionType` state (initially null). Type can be imported from `SessionTypeManager` or defined inline.

**Session type selector (calendar step guard):**
In the `step === 'calendar'` branch, when `sessionTypes && sessionTypes.length > 0 && !selectedSessionType`, show a session type selector panel instead of the calendar grid. Each session type is a clickable card/button showing label, price ($XX), and duration (XX min) if set. When a session type is clicked, set `selectedSessionType` and the calendar grid appears normally.

Add a "Change session type" link/button above the calendar when a session type IS selected, allowing the user to go back and pick a different type.

**Slot duration filtering:**
In the `timeSlotsForDay` useMemo, pass the selected session type's duration to `getSlotsForDate`:
```ts
const duration = selectedSessionType?.duration_minutes ?? undefined
return getSlotsForDate(selectedDate, slots, teacherTimezone, visitorTimezone, overrides, duration)
```
`getSlotsForDate` already accepts `durationMinutes` as the 7th param with a default of 30. No changes to slots.ts.

**Subject field guard (SESS-04 backward compat):**
In the booking form, the subject dropdown currently shows when `subjects.length > 1`. Add a guard: only show when `!(sessionTypes && sessionTypes.length > 0)`. When session types exist, hide the subject dropdown entirely — the session type label will be used as the subject.

**Subject pre-population:**
When `selectedSessionType` is set, pre-populate `form.subject` with `selectedSessionType.label`. Do this in the session type selector click handler (when setting `selectedSessionType`, also update form.subject).

**createPaymentIntent body extension:**
In the `createPaymentIntent` function, add `sessionTypeId: selectedSessionType?.id` to the JSON body. The create-intent route (T01) already accepts this.

**Price display:**
In the form step header area (the `border-b px-6 py-4` div), when a session type is selected, show the price: e.g. `$60 · SAT Prep` alongside the date and time.

**handleBookAnother reset:**
In `handleBookAnother`, add `setSelectedSessionType(null)` to the reset logic.

**Deferred path (submitAction):**
In the deferred path (`!stripeConnected`), add `session_type_id: selectedSessionType?.id` to the submitAction data object. The BookingRequestSchema (T01) already accepts optional session_type_id.

**Requirements advanced:** SESS-02 (session type selector with correct price), SESS-04 (backward compat — no session types = unchanged flow)
  - Estimate: 1h
  - Files: src/components/profile/BookingCalendar.tsx
  - Verify: npx tsc --noEmit && npm run build
