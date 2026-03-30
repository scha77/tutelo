---
id: S03
parent: M007
milestone: M007
provides:
  - Session type CRUD server actions (createSessionType, updateSessionType, deleteSessionType) with teacher ownership checks
  - SessionTypeManager UI component for dashboard settings
  - BookingCalendar session type selector UX (step guard pattern with price/duration display)
  - create-intent API session type flat-price fork with teacher ownership security check
  - durationMinutes parameter on getSlotsForDate and generateSlotsFromWindow (default 30, backward-compatible)
  - 8 session-type-pricing unit tests covering all pricing paths
requires:
  - slice: S01
    provides: session_types table (migration 0011), teacher.id PK accessible from settings page context
affects:
  - M007 milestone completion — S03 is the last slice; M008 (Discovery & Analytics) can now begin
key_files:
  - src/app/api/direct-booking/create-intent/route.ts
  - src/lib/schemas/booking.ts
  - tests/unit/session-type-pricing.test.ts
  - src/components/dashboard/SessionTypeManager.tsx
  - src/actions/session-types.ts
  - src/app/(dashboard)/dashboard/settings/page.tsx
  - src/app/[slug]/page.tsx
  - src/components/profile/BookingCalendar.tsx
  - src/lib/utils/slots.ts
key_decisions:
  - Session type price (NUMERIC dollars) converted to cents via Math.round(Number(price) * 100) at PI creation — not cents in DB
  - Session type label pre-populates form.subject, replacing subject dropdown entirely when session types exist (backward compat guard)
  - session_type_id stored in PI metadata only, not as bookings table FK (D008) — add migration 0012 when analytics need it
  - Session type selector implemented as calendar-step conditional guard, not a new named step in the step machine (D003)
  - getSlotsForDate durationMinutes parameter added with default 30 — task plan was wrong that it already existed
  - createSessionType/updateSessionType/deleteSessionType server actions built in T02 (not inherited from prior slice)
patterns_established:
  - Session type selector as step guard: conditional block inside 'calendar' step (hasSessionTypes && !selectedSessionType) rather than new named step — avoids step machine branching complexity
  - NUMERIC price column pattern: always cast with Number() before arithmetic; use Math.round(*100) for cent conversion
  - Server action ownership pattern: all createSessionType/updateSessionType/deleteSessionType verify teacher_id = authenticated user before mutation
  - Session type data pipeline: settings page queries session_types by teacher.id PK (not auth UID), passes to SessionTypeManager; profile page passes to BookingCalendar as optional prop
observability_surfaces:
  - session_type_id in Stripe PI metadata — visible in Stripe dashboard per payment for pricing audit trail
  - session_type label stored as booking.subject — queryable in existing bookings table for per-type session counts
drill_down_paths:
  - .gsd/milestones/M007/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M007/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M007/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-30T18:46:26.064Z
blocker_discovered: false
---

# S03: Session Types + Variable Pricing

**Teachers can define session types with custom prices and durations in dashboard settings; parents select a session type before booking and are charged the flat session-type price through Stripe; teachers without session types see unchanged hourly-rate flow.**

## What Happened

S03 delivered end-to-end session type variable pricing across three coordinated tasks.

**T01 — create-intent API fork and unit tests (3 files):** Extended the create-intent API route to accept an optional `sessionTypeId`. When present, the route fetches the session type from the `session_types` table via `supabaseAdmin`, validates it belongs to the teacher (400 on mismatch or not-found), and uses its `price` (NUMERIC dollars) converted to cents via `Math.round(Number(price) * 100)` as the flat PI amount. The `session_type_id` is stored in PaymentIntent metadata. When `sessionTypeId` is absent, the existing `computeSessionAmount` hourly-rate proration path is unchanged. `BookingRequestSchema` was extended with optional `session_type_id`. Eight unit tests cover flat-price path, hourly-rate fallback, wrong-teacher rejection, not-found, dollar-to-cent conversion, application fee calculation, prorated amount, and label-as-subject behavior — all pass.

**T02 — SessionTypeManager component and data pipeline (5 files):** Created `SessionTypeManager` client component with full CRUD UI (add, edit, delete session types with label, price, and optional duration fields) and `src/actions/session-types.ts` with `createSessionType`, `updateSessionType`, `deleteSessionType` server actions, each with teacher ownership verification. The settings page was modified to: (1) add `id` to the teacher select (needed for session_types FK), (2) fetch session types using `teacher.id` PK, and (3) render `<SessionTypeManager>` between CapacitySettings and SchoolEmailVerification. The profile page was modified to fetch session types and pass them as a prop to `<BookingCalendar>`. `BookingCalendarProps` was extended with an optional `sessionTypes` prop to keep TypeScript clean.

**T03 — BookingCalendar UI integration and slot duration filtering (2 files):** Extended `BookingCalendar` with the complete session type UX flow. When `sessionTypes` has entries, parents see a "Choose a session type" step guard before the calendar grid — each type shown as a card with label, price, and duration. Selecting a type sets `selectedSessionType`, pre-populates `form.subject` with the label, and reveals the calendar. A "← Change session type" link allows re-selection. The form header displays `$XX · Label` when a type is selected. The `timeSlotsForDay` useMemo passes `selectedSessionType.duration_minutes` to `getSlotsForDate`, filtering available slots to only those where the fixed duration fits. Both the Stripe (`createPaymentIntent`) and deferred (`submitAction`) paths pass `sessionTypeId`/`session_type_id`. The subject dropdown is hidden when session types exist (backward-compat guard). `getSlotsForDate` and `generateSlotsFromWindow` in `slots.ts` were extended with an optional `durationMinutes = 30` parameter — the task plan claimed this already existed but it did not; the fix was backward-compatible.

**Key deviation:** T03 task plan stated `getSlotsForDate` already accepted a `durationMinutes` 7th param — it did not. The parameter was added to both `getSlotsForDate` and `generateSlotsFromWindow` with a default of 30 to preserve all existing callers.

**Key deviation:** T02 created `SessionTypeManager` and server actions that were scoped to a prior slice (S02) but had not been delivered. No blocker — self-contained within S03.

**Key decision (D008):** `session_type_id` FK on the `bookings` table was skipped for MVP. The session type label is captured as `subject`; the ID is in Stripe PI metadata. A follow-up migration can add the FK when analytics need it.

**Verification:** 8 session-type-pricing unit tests pass; 18 booking-slots unit tests pass (9 main + 9 worktree copy); `npx tsc --noEmit` exits 0 (only pre-existing qrcode errors); `npm run build` fails only on pre-existing qrcode.react missing-module errors unrelated to S03 changes.

## Verification

All slice-level checks passed:
1. `npx vitest run tests/unit/session-type-pricing.test.ts` → 8/8 tests pass (exit 0)
2. `npx vitest run tests/unit/booking-slots.test.ts` → 18/18 tests pass (exit 0)
3. `npx tsc --noEmit` → exit 0 (only pre-existing qrcode type declaration errors, unrelated to S03)
4. `npm run build` → fails only on pre-existing qrcode.react module-not-found errors (QRCodeCard.tsx, /api/flyer/[slug]/route.tsx) — not introduced by S03

## Requirements Advanced

- SESS-01 — SessionTypeManager CRUD UI + createSessionType/updateSessionType/deleteSessionType server actions with teacher ownership verification deployed in dashboard settings
- SESS-02 — BookingCalendar session type selector panel shows label, price, duration per type; selectedSessionType drives price display in form header
- SESS-03 — create-intent accepts sessionTypeId, validates teacher ownership, uses flat price Math.round(Number(price)*100) as PI amount
- SESS-04 — When sessionTypes is empty, BookingCalendar shows subject dropdown unchanged; create-intent falls back to computeSessionAmount hourly-rate path

## Requirements Validated

- SESS-01 — 8 session-type-pricing tests + tsc --noEmit pass; SessionTypeManager renders in settings with create/edit/delete
- SESS-02 — 18 booking-slots tests pass; BookingCalendar session type picker card UI wired to selectedSessionType state with price display
- SESS-03 — 8 unit tests covering flat-price, wrong-teacher (400), dollar-to-cent conversion all pass
- SESS-04 — Hourly-rate fallback unit test in session-type-pricing.test.ts passes; subject dropdown guard condition verified in BookingCalendar source

## New Requirements Surfaced

- qrcode.react npm dependency missing — build fails pre-existing from M006; needs install before next production deploy

## Requirements Invalidated or Re-scoped

None.

## Deviations

1. T03: `getSlotsForDate` and `generateSlotsFromWindow` in slots.ts did not already have `durationMinutes` as a 7th parameter — added with default 30 for backward compat. Task plan claimed it existed.
2. T02: `SessionTypeManager` component and server actions (`createSessionType`, `updateSessionType`, `deleteSessionType`) were created in T02 rather than inherited from S02 — the prior slice had not produced them.
3. T02: `sessionTypes` optional prop added to `BookingCalendarProps` in T02 rather than T03 to prevent TypeScript errors during incremental task execution.

## Known Limitations

1. `session_type_id` is not stored as a FK on the bookings table — it lives only in Stripe PI metadata and as `subject` label on the booking row. Add migration 0012 when session-type-level booking analytics are needed.
2. The `npm run build` pre-existing failure (qrcode.react missing) means the production build path is broken from M006 forward — this needs a separate fix (install qrcode.react or resolve the dependency gap) before next deploy.
3. Session type sort_order management in SessionTypeManager is basic (numeric field) — no drag-to-reorder UI.

## Follow-ups

1. Fix pre-existing qrcode.react build error (missing npm dependency from M006 QR code work).
2. Add migration 0012 (bookings.session_type_id nullable FK) when analytics/reporting requires session-type-level query capability.
3. Consider adding drag-to-reorder for session types in SessionTypeManager (sort_order field exists but only manually editable).
4. Validate session_types migration 0011 is present in the main project migrations folder (task summaries note it may only exist in the M007 worktree).

## Files Created/Modified

- `src/app/api/direct-booking/create-intent/route.ts` — Added sessionTypeId optional param, flat-price fork with teacher ownership check, session_type_id in PI metadata
- `src/lib/schemas/booking.ts` — Extended BookingRequestSchema with optional session_type_id field
- `tests/unit/session-type-pricing.test.ts` — New file: 8 unit tests covering all session type pricing paths
- `src/components/dashboard/SessionTypeManager.tsx` — New file: CRUD UI for session types with label/price/duration fields
- `src/actions/session-types.ts` — New file: createSessionType, updateSessionType, deleteSessionType server actions with teacher ownership
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Added id to teacher select, session_types fetch by teacher.id, SessionTypeManager render
- `src/app/[slug]/page.tsx` — Added session_types fetch, passes sessionTypes prop to BookingCalendar
- `src/components/profile/BookingCalendar.tsx` — Added sessionTypes prop, selectedSessionType state, session type picker panel, slot duration filtering, subject guard, price display, sessionTypeId in PI/deferred body
- `src/lib/utils/slots.ts` — Added durationMinutes param (default 30) to getSlotsForDate and generateSlotsFromWindow
