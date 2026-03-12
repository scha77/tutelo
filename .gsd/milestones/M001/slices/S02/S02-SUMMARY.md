---
id: S02
parent: M001
milestone: M001
provides:
  - /dashboard/requests RSC page with pending booking cards
  - RequestCard client component with inline accept/decline (useTransition)
  - CopyLinkButton client component for empty state
  - Sidebar updated: Requests nav item first, pendingCount badge
  - Dashboard layout: parallel pending count query + Stripe warning banner
  - src/lib/email.ts with Resend sendBookingEmail implementation
  - sendBookingEmail() function with conditional template branching on stripe_charges_enabled
  - MoneyWaitingEmail react-email template (urgent Stripe activation CTA)
  - BookingNotificationEmail react-email template (standard dashboard link CTA)
  - email.test.ts: 3 passing unit tests covering all branching logic
requires: []
affects: []
key_files: []
key_decisions:
  - "Badge uses href comparison ('/dashboard/requests') not label string for coupling safety"
  - "Stripe warning banner is conditional layout block, not a separate notification system"
  - "pendingCount fetched sequentially after teacher (needs teacher.id), not truly parallel"
  - "email.ts created as real Resend implementation (overwritten from stub by external 02-03 TDD process)"
  - "vi.mock('@/lib/email') in test file prevents Vite import analysis error for dynamic import"
  - "Pre-existing email.test.ts failures (3 tests) from 02-03 RED phase are out of scope — logged to deferred-items"
  - "vi.hoisted() + class-based MockResend required for Vitest ESM mocking of `new Resend()` — vi.fn().mockImplementation() is not a constructor in Vitest's SSR transform"
  - "Module-level `const resend = new Resend(...)` works with class-based mock — no lazy-init needed"
  - "RESEND_API_KEY documented in .env.local as placeholder — team must provision real key before email delivery works"
patterns_established:
  - "Server Actions passed as props from RSC to client components (acceptAction/declineAction)"
  - "useTransition + local pendingAction state for independent per-button loading"
  - "Layout-level data queries (pendingCount + stripe_charges_enabled) fed into Sidebar + conditional banners"
  - "vi.hoisted() for mock variables referenced inside vi.mock() factory closures"
  - "Class-based mock (class MockX { constructor() {} }) when production code uses `new X()` — avoids 'not a constructor' error in Vitest ESM"
  - "Fire-and-forget email: sendBookingEmail called without await inside try/catch so booking confirmation is never blocked"
observability_surfaces: []
drill_down_paths: []
duration: 4min
verification_result: passed
completed_at: 2026-03-06
blocker_discovered: false
---
# S02: Booking Requests

**# Phase 2 Plan 1: Booking Core — Schema, RPC, Server Actions, Calendar Update Summary**

## What Happened

# Phase 2 Plan 1: Booking Core — Schema, RPC, Server Actions, Calendar Update Summary

**One-liner:** Atomic create_booking() Postgres RPC + BookingRequestSchema Zod v4 + three Server Actions (submit/accept/decline) + BookingCalendar with inline success/error states and subject dropdown.

## What Was Built

### Migration: 0003_create_booking_fn.sql
- Tightened `bookings_anon_insert` RLS policy: replaced `WITH CHECK (true)` with `EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_id AND teachers.is_published = TRUE)`
- Created `create_booking()` SECURITY DEFINER Postgres function with atomic insert and `unique_violation` exception handling — returns `{success: true, booking_id}` or `{success: false, error: 'slot_taken'}`
- GRANT EXECUTE to `anon` and `authenticated` roles

### Schema: src/lib/schemas/booking.ts
- `BookingRequestSchema` Zod v4 object with teacherId (uuid), studentName (min 1), subject (min 1), email, notes (optional), bookingDate (YYYY-MM-DD regex), startTime / endTime (HH:MM regex)
- `BookingRequestData` type inferred from schema

### Server Actions: src/actions/bookings.ts
- `submitBookingRequest(formData: unknown)`: validates with schema, calls `supabase.rpc('create_booking', {...})`, maps result to `BookingResult` union, fires email via dynamic import (fire-and-forget), revalidates `/[slug]` page
- `acceptBooking(bookingId: string)`: authenticated teacher; updates `status = 'pending'` WHERE status = 'requested'; revalidates `/dashboard/requests` + layout
- `declineBooking(bookingId: string)`: same pattern; sets `status = 'cancelled'`
- `BookingResult` type exported: `{ success: true; bookingId: string } | { success: false; error: 'slot_taken' | 'validation' | 'server' }`
- No Stripe gate — booking creation succeeds regardless of `stripe_charges_enabled` (STRIPE-01 requirement)

### BookingCalendar: src/components/profile/BookingCalendar.tsx
- New props: `subjects: string[]`, `teacherId: string`, `submitAction: (data: unknown) => Promise<BookingResult>`
- `TimeSlot` interface gains `endRaw: string` field (extracted from `slot.end_time.slice(0, 5)`)
- Step state extended to `'calendar' | 'form' | 'success' | 'error'`
- Form state gains `subject` field; auto-initializes to `subjects[0]` when `subjects.length === 1`
- Subject dropdown (shadcn Select) hidden when single subject, shown when multiple
- Field order locked: Student's name → Subject (if visible) → Email → Notes (optional)
- Label updated: "Student's name" (was "Your Name")
- Notes placeholder personalized with teacher first name: "Let [firstName] know what grade level..."
- `handleSubmit` calls `submitAction` with `bookingDate: format(selectedDate!, 'yyyy-MM-dd')` (no UTC shift), `startTime: selectedSlot!.startRaw`, `endTime: selectedSlot!.endRaw`
- Inline success state: CheckCircle2 icon (accentColor), confirmed date/time/subject/email, "Book another time" reset button
- Inline error state: error message text, "Back to calendar" button
- Removed unused `sonner` toast from booking submit flow

### /[slug] page: src/app/[slug]/page.tsx
- Imports `submitBookingRequest` from `@/actions/bookings` in Server Component
- Passes `subjects={teacher.subjects ?? []}`, `teacherId={teacher.id}`, `submitAction={submitBookingRequest}` to BookingCalendar
- Server Action passed as prop (not imported inside client component — respects client/server boundary)

### Tests
- `booking-schema.test.ts`: 6 real passing tests covering valid payload, missing studentName, invalid email, wrong date format, wrong time format, optional notes
- `booking-action.test.ts`: 5 `it.todo()` stubs (implemented in plan 02-02+)
- `booking-calendar.test.tsx`: 5 `it.todo()` stubs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 stricter UUID validation in tests**
- **Found during:** Task 0 GREEN phase
- **Issue:** Test UUID `00000000-0000-0000-0000-000000000001` failed Zod v4's new UUID regex which requires valid RFC 4122 version nibble (1-8) and variant bits (89ab). The test payload used a placeholder UUID that was valid in Zod v3 but invalid in v4.
- **Fix:** Changed test UUID to `550e8400-e29b-41d4-a716-446655440000` (valid RFC 4122 v4 UUID)
- **Files modified:** `tests/bookings/booking-schema.test.ts`
- **Commit:** 44dc672

**2. [Rule 3 - Blocking] TypeScript error on intentionally missing email module**
- **Found during:** Task 1 TypeScript check
- **Issue:** `import('@/lib/email')` inside `try/catch` still caused `TS2307: Cannot find module` because TypeScript resolves dynamic import paths statically
- **Fix:** Added `// @ts-expect-error` comment above the dynamic import with explanation (email module created in Plan 02-03)
- **Files modified:** `src/actions/bookings.ts`
- **Commit:** dafbb4d

**3. [Rule 1 - Bug] HTML entity `&apos;` used inside JS template literal**
- **Found during:** Task 2 code review before commit
- **Issue:** Textarea placeholder used `&apos;` inside a JavaScript template literal — this would render literally as `&apos;` text, not an apostrophe
- **Fix:** Changed to regular apostrophes inside the template literal string
- **Files modified:** `src/components/profile/BookingCalendar.tsx`
- **Commit:** 42bbe75

## Self-Check: PASSED

### Files Exist
- FOUND: supabase/migrations/0003_create_booking_fn.sql
- FOUND: src/lib/schemas/booking.ts
- FOUND: src/actions/bookings.ts
- FOUND: src/components/profile/BookingCalendar.tsx
- FOUND: tests/bookings/booking-schema.test.ts
- FOUND: tests/bookings/booking-action.test.ts
- FOUND: tests/bookings/booking-calendar.test.tsx

### Commits Exist
- FOUND: 44dc672 (Task 0: schema + migration + test scaffolds)
- FOUND: dafbb4d (Task 1: bookings Server Actions)
- FOUND: 42bbe75 (Task 2: BookingCalendar + /[slug] page)

# Phase 2 Plan 2: Teacher-Facing Booking Requests Dashboard Summary

**Teacher dashboard with /dashboard/requests page, RequestCard inline accept/decline, Requests-first Sidebar nav with badge, and layout-level Stripe connection warning banner.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T04:09:11Z
- **Completed:** 2026-03-06T04:12:XX Z
- **Tasks:** 3 of 3 complete (Task 3 human-verify checkpoint approved)
- **Files modified:** 8

## Accomplishments

- Created /dashboard/requests RSC page that fetches pending bookings and renders RequestCard list or empty state
- Built RequestCard client component with independent accept/decline loading states via useTransition
- Updated Sidebar with Requests as first nav item and dynamic badge for pending count
- Updated dashboard layout to fetch pendingCount + stripe_charges_enabled and show Stripe warning banner
- Implemented real acceptBooking/declineBooking unit tests (5 passing, replacing it.todo stubs)

## Task Commits

1. **Task 1: Dashboard requests page + RequestCard component** - `ea1854c` (feat)
2. **Task 2: Sidebar + layout updates** - `c4cfa92` (feat)
3. **Task 3: Human verify — end-to-end booking loop** - APPROVED (full booking loop verified in browser)

## Files Created/Modified

- `src/app/(dashboard)/dashboard/requests/page.tsx` - RSC page: auth check, teacher fetch, pending bookings query, RequestCard list or empty state
- `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` - Client component: copies tutelo.app/slug to clipboard with visual feedback
- `src/components/dashboard/RequestCard.tsx` - Client component: student name, subject badge, formatted date/time (teacher timezone), parent email, submitted-ago, accept/decline buttons with useTransition
- `src/lib/email.ts` - Resend sendBookingEmail: MoneyWaitingEmail (pre-Stripe) + BookingNotificationEmail (post-Stripe)
- `src/components/dashboard/Sidebar.tsx` - Added pendingCount prop, Requests nav item first (Inbox icon), badge when pending > 0
- `src/app/(dashboard)/dashboard/layout.tsx` - Extended teacher select (stripe_charges_enabled), added pending count query, passes pendingCount to Sidebar, renders amber Stripe banner
- `src/actions/bookings.ts` - Removed @ts-expect-error (email module now exists)
- `tests/bookings/booking-action.test.ts` - Real tests for acceptBooking/declineBooking (5 tests passing)

## Decisions Made

- Badge uses `href === '/dashboard/requests'` not label string to avoid fragile string coupling
- Stripe warning banner is a conditional block in the layout, not a separate component or notification system (per CONTEXT.md locked decision)
- pendingCount is fetched sequentially after teacher (requires teacher.id) — not truly parallel, but minimal latency cost
- Pre-existing email.test.ts failures from Plan 02-03 TDD RED phase logged to deferred-items.md (out of scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite import analysis error for dynamic @/lib/email import**
- **Found during:** Task 1 (booking-action.test.ts RED phase)
- **Issue:** `import('@/lib/email')` inside bookings.ts caused Vite to fail resolving the module at transform time even with `@ts-expect-error`. The mock in the test file runs at runtime, too late for Vite's static import analysis.
- **Fix:** Created `src/lib/email.ts` (initially a no-op stub, later overwritten by 02-03 TDD process with real Resend implementation). Added `vi.mock('@/lib/email')` to test file. Removed `@ts-expect-error` from bookings.ts.
- **Files modified:** src/lib/email.ts, tests/bookings/booking-action.test.ts, src/actions/bookings.ts
- **Verification:** All 5 booking-action tests pass; TypeScript clean
- **Committed in:** ea1854c (Task 1 commit)

**2. [Rule 1 - Note] email.ts overwritten by external 02-03 TDD process**
- **Found during:** Task 1 post-commit
- **Issue:** The stub email.ts I created was silently overwritten by an automated linter/tool process with the full Resend + react-email implementation (the Plan 02-03 GREEN phase content). This is not a bug — it's the intended 02-03 implementation landing early.
- **Fix:** No action required. The real implementation is correct and TypeScript compiles clean.
- **Files modified:** src/lib/email.ts (external modification)
- **Verification:** TypeScript clean; tests pass

**3. [Post-checkpoint] Sidebar badge redesigned from red to green pulsing dot**
- **Found during:** Human-verify checkpoint (Task 3 — user-requested improvement)
- **Issue:** The red badge on the Requests nav item was visually heavy and read as an error state rather than a positive "new activity" signal.
- **Fix:** Replaced red `bg-destructive` count badge with: (a) small green `animate-pulse` dot overlaying the Inbox icon, and (b) green `bg-green-500` count badge. Both convey "new booking" warmly rather than urgently.
- **Files modified:** `src/components/dashboard/Sidebar.tsx`
- **Committed in:** User-applied after checkpoint approval (on main)

**4. [Post-checkpoint] Stripe banner now shows whenever stripe_charges_enabled is false**
- **Found during:** Human-verify checkpoint (Task 3 — user-requested improvement)
- **Issue:** Plan spec only showed the banner when `pendingCount > 0 && !stripe_charges_enabled`. Teachers who haven't connected Stripe but have no pending requests see no prompt to activate payments.
- **Fix:** Banner now renders whenever `!stripe_charges_enabled` with two message variants: urgent "You have N pending request(s)! Connect Stripe to confirm them." when pending > 0, and general "Connect Stripe to start accepting payments from parents." when no pending requests.
- **Files modified:** `src/app/(dashboard)/dashboard/layout.tsx`
- **Committed in:** User-applied after checkpoint approval (on main)

---

**Total deviations:** 4 (1 blocking auto-fix, 1 informational note, 2 post-checkpoint UX improvements)
**Impact on plan:** Auto-fix was necessary to unblock tests. Email module landing early is a net positive for Plan 02-03. Post-checkpoint changes are incremental UX improvements on existing plan artifacts.

## Issues Encountered

- Pre-existing test failures: `tests/bookings/email.test.ts` has 3 failing tests from Plan 02-03 TDD RED phase (Resend constructor mock pattern incorrect). Logged to deferred-items.md. Fix belongs in Plan 02-03 GREEN phase.

## User Setup Required

None — no external service configuration required for this plan's UI changes. Stripe and Resend setup handled in Plans 02-03+.

## Next Phase Readiness

- Booking request UI complete: teachers can see, accept, and decline requests
- Stripe warning banner wired to /dashboard/connect-stripe (placeholder link ready for Phase 3)
- email.ts is production-ready once RESEND_API_KEY + email templates are configured (Plan 02-03)
- Human checkpoint (Task 3) approved — full booking loop verified end-to-end

## Self-Check: PASSED

### Files Exist
- FOUND: src/app/(dashboard)/dashboard/requests/page.tsx
- FOUND: src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx
- FOUND: src/components/dashboard/RequestCard.tsx
- FOUND: src/lib/email.ts
- FOUND: .planning/phases/02-booking-requests/02-02-SUMMARY.md

### Commits Exist
- FOUND: ea1854c (Task 1: requests page + RequestCard)
- FOUND: c4cfa92 (Task 2: Sidebar + layout)

---
*Phase: 02-booking-requests*
*Completed: 2026-03-06*

# Phase 2 Plan 3: Email Notification — Resend + react-email Templates Summary

**Resend + react-email wired to booking submission: MoneyWaitingEmail (urgent Stripe CTA for unconnected teachers) and BookingNotificationEmail (dashboard link for connected teachers), with silent skip when social_email is null.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T04:09:08Z
- **Completed:** 2026-03-06T04:13:25Z
- **Tasks:** 2 (Task 0: install packages, Task 1: TDD email implementation)
- **Files modified:** 7

## Accomplishments

- Installed resend + @react-email/components; both verified importable in Node
- Created MoneyWaitingEmail: warm, urgent tone, "Activate Payments →" CTA linking to `/dashboard/connect-stripe`
- Created BookingNotificationEmail: standard notification, "View Requests →" CTA linking to `/dashboard/requests`
- Implemented sendBookingEmail() with full conditional branching: money-waiting (Stripe not connected) vs standard notification (connected) vs silent skip (null social_email)
- 3 email branching tests pass; full suite: 41 tests pass, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 0: Install packages** - `1d4a950` (chore)
2. **Task 1 RED: Failing tests** - `c913477` (test)
3. **Task 1 GREEN: Email implementation** - `1317cbc` (feat)

_Note: TDD task has 2 commits (test RED → feat GREEN)_

## Files Created/Modified

- `src/lib/email.ts` - sendBookingEmail() with Resend API + conditional template branching
- `src/emails/MoneyWaitingEmail.tsx` - react-email template for unconnected-Stripe teachers
- `src/emails/BookingNotificationEmail.tsx` - react-email template for Stripe-connected teachers
- `tests/bookings/email.test.ts` - 3 unit tests covering all branching cases
- `package.json` - added resend, @react-email/components
- `package-lock.json` - lockfile updated
- `.env.local` - RESEND_API_KEY placeholder documented

## Decisions Made

- **vi.hoisted() + class-based mock pattern:** `vi.fn().mockImplementation()` throws "not a constructor" in Vitest's ESM/SSR transform when production code uses `new Resend()`. Solution: `vi.hoisted()` to capture mock reference before hoisting, then `class MockResend { constructor() {} emails = { send: sendEmailMock } }` in mock factory.
- **Module-level resend instantiation:** No lazy-init needed — the class-based mock intercepts `new Resend()` correctly at module evaluation time. Simpler code.
- **RESEND_API_KEY as placeholder:** Value documented in .env.local as `re_...` — actual key must be provisioned from Resend dashboard before email delivery works in production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest ESM constructor mock pattern**
- **Found during:** Task 1 GREEN phase (tests failing after implementation)
- **Issue:** `vi.fn().mockImplementation(() => ({...}))` and `vi.fn(() => ({...}))` both threw "() => ({...}) is not a constructor" when production code called `new Resend()` — Vitest's SSR transform does not make arrow functions constructable
- **Fix:** Changed to `vi.hoisted()` for pre-hoisting the sendEmailMock variable, and used a real class declaration (`class MockResend`) in the `vi.mock()` factory so `new Resend()` works correctly
- **Files modified:** `tests/bookings/email.test.ts`
- **Verification:** All 3 email tests pass, full suite 41 passed
- **Committed in:** 1317cbc (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test mock pattern)
**Impact on plan:** Auto-fix necessary for test infrastructure correctness. Established a reusable mock pattern for any future tests that mock classes. No scope creep.

## Issues Encountered

None beyond the mock pattern issue documented above.

## User Setup Required

Before email delivery works, the following must be configured:

**Environment variables:**
- `RESEND_API_KEY` — get from resend.com → API Keys → Create API Key
- `NEXT_PUBLIC_APP_URL` — already set to `http://localhost:3000` in .env.local; set to `https://tutelo.app` in Vercel

**Optional Resend Dashboard:**
- Verify sender domain for production (`noreply@tutelo.app`). For testing, `onboarding@resend.dev` works without domain verification.

## Next Phase Readiness

- Email notification loop is complete: booking submission → sendBookingEmail → Resend API → teacher inbox
- The fire-and-forget import in `submitBookingRequest` now resolves correctly (no module-not-found, no @ts-expect-error needed)
- Phase 3 (Stripe Connect) will build on the `stripe_charges_enabled` flag this plan already reads

---
*Phase: 02-booking-requests*
*Completed: 2026-03-06*

## Self-Check: PASSED

### Files Exist
- FOUND: src/emails/MoneyWaitingEmail.tsx
- FOUND: src/emails/BookingNotificationEmail.tsx
- FOUND: src/lib/email.ts
- FOUND: tests/bookings/email.test.ts

### Commits Exist
- FOUND: 1d4a950 (Task 0: install packages)
- FOUND: c913477 (Task 1 RED: failing tests)
- FOUND: 1317cbc (Task 1 GREEN: implementation)
