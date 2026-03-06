---
phase: 02-booking-requests
verified: 2026-03-06T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
human_verification:
  - test: "End-to-end booking submission on public page"
    expected: "Parent selects slot, fills form, submits, sees inline success state with date/time/subject/email. No page navigation — everything inline inside the BookingCalendar card."
    why_human: "Cannot verify actual Supabase DB round-trip (RPC call), inline React state transitions, or visual presentation programmatically without a running app."
  - test: "Duplicate slot booking shows inline error"
    expected: "After a slot is already taken, submitting again shows 'This time slot was just booked. Please choose another.' with a Back to calendar button — no page change, no crash."
    why_human: "Requires two live DB writes in sequence against a real Supabase instance."
  - test: "Migration 0003 applied and create_booking() function active"
    expected: "npx supabase db push (or manual SQL paste) succeeds. create_booking() callable via supabase.rpc(). Tightened RLS blocks inserts on unpublished teacher pages."
    why_human: "SQL migration execution against Supabase cloud project cannot be verified programmatically from the codebase alone."
  - test: "Teacher email received after booking submission"
    expected: "When RESEND_API_KEY is provisioned, teacher receives the correct email variant: MoneyWaitingEmail (Stripe not connected) or BookingNotificationEmail (connected). Email is never blocking — booking confirmation shows even if email delivery fails."
    why_human: "Requires live Resend API key and email delivery. Fire-and-forget behavior needs runtime observation."
  - test: "Dashboard requests page renders and accept/decline work"
    expected: "Logged-in teacher at /dashboard/requests sees pending request cards with student name, subject, date/time (in teacher timezone), parent email, and submitted-ago timestamp. Clicking Accept removes the card and decrements the badge. Clicking Decline does the same. No modal or confirmation required."
    why_human: "Requires authenticated session, real booking in DB, and live revalidatePath behavior — none verifiable statically."
  - test: "Stripe banner shows on all dashboard pages when not connected"
    expected: "Amber banner 'Connect Stripe to start accepting payments from parents.' appears at top of all dashboard pages when stripe_charges_enabled = false. When pending requests exist, message changes to 'You have N pending request(s)! Connect Stripe to confirm them.' Banner is absent when stripe_charges_enabled = true."
    why_human: "Requires authenticated session with a specific teacher record state to verify conditional rendering."
---

# Phase 2: Booking Requests — Verification Report

**Phase Goal:** Parents can submit booking requests on a teacher's public profile page, and teachers can see and act on those requests in their dashboard.
**Verified:** 2026-03-06
**Status:** human_needed (all automated checks passed; 6 items need human verification with a running app)
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Parent can select a time slot, fill out student name/subject/email/notes, and submit — no account required | VERIFIED | `BookingCalendar.tsx` has full form (lines 423–498); `submitBookingRequest` in `bookings.ts` has no auth check; form uses `submitAction` prop passed from RSC page |
| 2 | Booking is inserted atomically; a duplicate slot returns an inline error, not a crash | VERIFIED | `0003_create_booking_fn.sql` creates SECURITY DEFINER RPC with `unique_violation` handler returning `{success: false, error: 'slot_taken'}`; `BookingCalendar.tsx` sets `step='error'` on `slot_taken` result |
| 3 | After success, an inline confirmation appears inside the BookingCalendar card with the booked date, time, and subject | VERIFIED | `BookingCalendar.tsx` lines 253–280: `step === 'success'` renders CheckCircle2 icon, date, time, subject, email — all within the existing card element, no navigation |
| 4 | After a double-booking error, an inline error message appears with a back button | VERIFIED | `BookingCalendar.tsx` lines 281–294: `step === 'error'` renders `errorMessage` text and "← Back to calendar" button |
| 5 | Teacher without Stripe can still receive booking requests (STRIPE-01) | VERIFIED | `submitBookingRequest` in `bookings.ts` has no `stripe_charges_enabled` check whatsoever; RPC function also has no Stripe gate |
| 6 | Teacher sees 'Requests' as first item in the sidebar nav | VERIFIED | `Sidebar.tsx` lines 14–20: `navItems` array has `/dashboard/requests` as first element with `Inbox` icon |
| 7 | Sidebar badge shows count of pending requests when count > 0 | VERIFIED | `Sidebar.tsx` lines 74–83: green pulsing dot + count badge both render when `href === '/dashboard/requests' && pendingCount > 0` |
| 8 | Each pending request card shows: student name, subject, date/time (teacher timezone), parent email, submitted-ago | VERIFIED | `RequestCard.tsx` lines 62–101: all five fields present and formatted; `formatInTimeZone` used for teacher-timezone display |
| 9 | Accept and Decline buttons are inline on the card — no modal | VERIFIED | `RequestCard.tsx` lines 86–101: both buttons render inline; `useTransition` provides loading states; no modal or confirmation dialog present |
| 10 | Accepting changes booking status to 'pending'; Declining changes status to 'cancelled' | VERIFIED | `bookings.ts` `acceptBooking` (line 72) updates `status = 'pending'`; `declineBooking` (line 103) updates `status = 'cancelled'`; unit tests for both pass |
| 11 | After a booking is submitted, teacher receives the correct email | VERIFIED | `email.ts` branches on `stripe_charges_enabled`: `MoneyWaitingEmail` (Stripe not connected) vs `BookingNotificationEmail` (connected); 3 email branching unit tests pass |
| 12 | Email is fire-and-forget — it never blocks booking confirmation | VERIFIED | `bookings.ts` lines 40–47: dynamic import inside `try/catch`, `.catch(console.error)` (not `await`); booking `return { success: true }` at line 50 regardless of email outcome |

**Score:** 12/12 truths verified (automated)

---

### Required Artifacts

#### Plan 02-01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/0003_create_booking_fn.sql` | VERIFIED | 95 lines; `CREATE OR REPLACE FUNCTION create_booking` with unique_violation handler; tightened `bookings_anon_insert` RLS policy; GRANT EXECUTE to anon + authenticated |
| `src/lib/schemas/booking.ts` | VERIFIED | Exports `BookingRequestSchema` (8 fields, Zod v4) and `BookingRequestData` type |
| `src/actions/bookings.ts` | VERIFIED | Exports `submitBookingRequest`, `acceptBooking`, `declineBooking`, `BookingResult`; `'use server'` directive present; calls `supabase.rpc('create_booking', {...})` |
| `src/components/profile/BookingCalendar.tsx` | VERIFIED | Accepts `subjects`, `teacherId`, `submitAction` props; `TimeSlot` includes `endRaw`; step state `'calendar' | 'form' | 'success' | 'error'`; inline success/error states present; subject dropdown hidden for single subject |
| `src/app/[slug]/page.tsx` | VERIFIED | Imports `submitBookingRequest` from `@/actions/bookings`; passes `subjects`, `teacherId`, `submitAction` to `BookingCalendar` |

#### Plan 02-02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/(dashboard)/dashboard/requests/page.tsx` | VERIFIED | RSC; auth check; teacher fetch; pending bookings query (status='requested'); renders `RequestCard` list or empty state with `CopyLinkButton` |
| `src/components/dashboard/RequestCard.tsx` | VERIFIED | `'use client'`; `useTransition` + `pendingAction` state for independent loading; all 5 required fields rendered; accept/decline buttons inline |
| `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` | VERIFIED | `'use client'`; `navigator.clipboard.writeText()`; copied feedback state; fallback for older browsers |
| `src/components/dashboard/Sidebar.tsx` | VERIFIED | `pendingCount: number` prop added; `Requests` first in nav with `Inbox` icon; green pulse dot + count badge when `pendingCount > 0`; href comparison (not label string) |
| `src/app/(dashboard)/dashboard/layout.tsx` | VERIFIED | Selects `stripe_charges_enabled`; pending count query via `.select('id', { count: 'exact', head: true })`; `pendingCount` passed to `Sidebar`; amber banner renders when `!stripe_charges_enabled` with two message variants |

#### Plan 02-03 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/email.ts` | VERIFIED | Exports `sendBookingEmail(teacherId, bookingId, bookingData)`; queries `full_name, social_email, stripe_charges_enabled`; silent skip when `social_email` null; branches on `stripe_charges_enabled`; uses Resend API |
| `src/emails/MoneyWaitingEmail.tsx` | VERIFIED | Exports `MoneyWaitingEmail`; all required props; "Activate Payments →" CTA with `connectStripeUrl` href; urgent+warm tone |
| `src/emails/BookingNotificationEmail.tsx` | VERIFIED | Exports `BookingNotificationEmail`; all required props; "View Requests →" CTA with `dashboardUrl` href |

---

### Key Link Verification

#### Plan 02-01 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/[slug]/page.tsx` | `src/actions/bookings.ts` | `submitBookingRequest` imported and passed as `submitAction` prop | WIRED | Line 9: `import { submitBookingRequest } from '@/actions/bookings'`; line 112: `submitAction={submitBookingRequest}` |
| `src/components/profile/BookingCalendar.tsx` | `submitAction` prop | `handleSubmit` calls `submitAction({...})` | WIRED | Lines 186–195: `const result = await submitAction({teacherId, studentName, ...})` |
| `src/actions/bookings.ts` | `supabase.rpc` | `supabase.rpc('create_booking', {...})` | WIRED | Lines 16–25: full RPC call with all 8 parameters |

#### Plan 02-02 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(dashboard)/dashboard/layout.tsx` | `src/components/dashboard/Sidebar.tsx` | `pendingCount` prop passed | WIRED | Line 46: `pendingCount={pending}` |
| `src/components/dashboard/RequestCard.tsx` | `src/actions/bookings.ts` | `acceptAction` / `declineAction` props called on button click | WIRED | Lines 41–43: `const result = await acceptAction(booking.id)`; lines 50–52: `await declineAction(booking.id)` |
| `src/app/(dashboard)/dashboard/requests/page.tsx` | `src/actions/bookings.ts` | `acceptBooking`, `declineBooking` imported and passed as props | WIRED | Line 4: `import { acceptBooking, declineBooking } from '@/actions/bookings'`; lines 61–62: `acceptAction={acceptBooking} declineAction={declineBooking}` |

#### Plan 02-03 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/bookings.ts` | `src/lib/email.ts` | Dynamic import of `sendBookingEmail`, fire-and-forget | WIRED | Lines 41–47: `const { sendBookingEmail } = await import('@/lib/email')` inside try/catch; `.catch(console.error)` not awaited |
| `src/lib/email.ts` | `src/emails/MoneyWaitingEmail.tsx` | Imported and passed to `resend.emails.send({ react: MoneyWaitingEmail({...}) })` | WIRED | Line 3: import; line 37: `react: MoneyWaitingEmail({...})` |
| `src/lib/email.ts` | `teachers` table | `supabase SELECT social_email, stripe_charges_enabled` to branch email template | WIRED | Lines 15–19: `.select('full_name, social_email, stripe_charges_enabled').eq('id', teacherId).single()` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BOOK-01 | 02-01 | Parent submits booking request (no payment, no account) | SATISFIED | `submitBookingRequest` has no auth check; form requires only name/subject/email; notes optional |
| BOOK-02 | 02-01 | Parent sees pending confirmation after submission | SATISFIED | `BookingCalendar` `step === 'success'` renders "Session requested!" with date/time/subject and "We'll email [email] when confirmed" |
| BOOK-03 | 02-01 | Booking state machine: `requested → pending → confirmed → completed → cancelled` | SATISFIED | DB schema has `CHECK (status IN ('requested','pending','confirmed','completed','cancelled'))` (migration 0001); `acceptBooking` sets `pending`, `declineBooking` sets `cancelled` |
| BOOK-04 | 02-01 | Booking creation is atomic — double-booking impossible | SATISFIED | `create_booking()` Postgres function catches `unique_violation`; unique constraint `bookings_unique_slot` on `(teacher_id, booking_date, start_time)` |
| BOOK-06 | 02-02 | Teacher can accept or decline booking requests from dashboard | SATISFIED | `/dashboard/requests` page + `RequestCard` with working accept/decline buttons; unit tests pass |
| STRIPE-01 | 02-01 | Teacher NOT required to connect Stripe to receive booking requests | SATISFIED | `submitBookingRequest` has zero `stripe_charges_enabled` checks; RPC also unbounded by Stripe status |
| STRIPE-02 | 02-02, 02-03 | Teacher receives "money waiting" notification (email + in-app) when first booking arrives, with CTA to connect Stripe | SATISFIED | In-app: amber banner in `layout.tsx` with "Activate Payments →" link; email: `MoneyWaitingEmail` with `connectStripeUrl` CTA |
| NOTIF-01 | 02-03 | Teacher receives email when booking request submitted | SATISFIED | `sendBookingEmail` called fire-and-forget in `submitBookingRequest`; queries teacher's `social_email`; silently skips if null; 3 unit tests pass |
| DASH-02 | 02-02 | Teacher can view and action pending booking requests | SATISFIED | `/dashboard/requests` RSC fetches `status='requested'` bookings; `RequestCard` renders all required fields; accept/decline wired to Server Actions |

**All 9 Phase 2 requirements accounted for. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `src/components/profile/BookingCalendar.tsx` | HTML `placeholder=` attributes on inputs | Info | These are legitimate HTML placeholder attributes on form inputs — not stub implementations |
| `src/actions/bookings.ts` | `// @ts-expect-error` comment present in SUMMARY but NOT in current file | Info | The comment was removed in Plan 02-02 when `email.ts` was created; file is clean |

No blocking anti-patterns found. No TODO/FIXME/stub return patterns detected in any of the 12 artifacts.

---

### Test Suite Results

```
Test Files: 9 passed | 3 skipped (12)
Tests:      41 passed | 14 todo (55)
```

**Phase 2 tests breakdown:**
- `booking-schema.test.ts`: 6 real tests passing (valid payload, missing studentName, invalid email, bad date format, bad time format, optional notes)
- `booking-action.test.ts`: 5 real tests passing (acceptBooking: success + unauthenticated + teacher-not-found; declineBooking: success + unauthenticated) + 3 `it.todo` stubs for `submitBookingRequest` (require DB integration testing)
- `email.test.ts`: 3 real tests passing (MoneyWaitingEmail path, BookingNotificationEmail path, null social_email silent skip)
- `booking-calendar.test.tsx`: 5 `it.todo` stubs (require JSDOM + real rendering setup)

The 8 todo stubs are acceptable placeholders: the `submitBookingRequest` and `BookingCalendar` todos cannot be meaningfully tested without a DB mock for the full RPC chain or a JSDOM test environment configured for the calendar component. Core logic is covered by real tests.

**TypeScript:** Compiles clean — zero errors (`npx tsc --noEmit` produces no output).

---

### Human Verification Required

#### 1. End-to-End Booking Submission

**Test:** Visit `http://localhost:3000/[your-slug]`. Select an available day, pick a time slot, fill in student name + subject + email + optional notes, click "Request Session".
**Expected:** Inline success state appears inside the booking card: CheckCircle2 icon (teacher's accent color), "Session requested!", confirmed date, time, subject, and "We'll email [email] when confirmed." No page navigation. Clicking "Book another time" resets to the calendar.
**Why human:** React state transitions and live Supabase RPC call cannot be verified without a running app.

#### 2. Duplicate Slot Inline Error

**Test:** Submit a booking for a slot. Then attempt to submit a second booking for the exact same slot (same teacher, date, start_time).
**Expected:** Inline error state: "This time slot was just booked. Please choose another." with "← Back to calendar" button. No page change, no crash, no toast.
**Why human:** Requires two sequential live DB writes against a real Supabase instance.

#### 3. Migration 0003 Applied

**Test:** Run `npx supabase db push` (or paste `supabase/migrations/0003_create_booking_fn.sql` into the Supabase SQL Editor) against your project.
**Expected:** Migration succeeds. `create_booking()` function is callable. The tightened `bookings_anon_insert` policy blocks inserts on unpublished teacher pages.
**Why human:** SQL migration execution against a cloud Supabase project cannot be verified from the codebase alone.

#### 4. Email Delivery

**Test:** Set a real `RESEND_API_KEY` and ensure the teacher record has a `social_email` value. Submit a booking for a teacher with `stripe_charges_enabled = false`.
**Expected:** Teacher receives an email with subject "A parent wants to book you — connect Stripe to confirm" containing the student name, subject, date/time, parent email, and "Activate Payments →" CTA linking to `/dashboard/connect-stripe`. The booking confirmation (success state) appears on the public page regardless of whether email delivery succeeds.
**Why human:** Requires live Resend API key and email delivery to verify.

#### 5. Dashboard Accept/Decline

**Test:** Log in as a teacher. Navigate to `/dashboard/requests`. If a pending booking exists, click "Accept" on one card and "Decline" on another.
**Expected:** After Accept: card disappears from the list, sidebar badge decrements. After Decline: same. Both buttons show loading state (text changes to "Accepting…" / "Declining…") during the transition.
**Why human:** Requires authenticated session, real booking in DB, and live `revalidatePath` behavior — not verifiable statically.

#### 6. Stripe Banner Behavior

**Test:** Log in as a teacher with `stripe_charges_enabled = false`. Navigate to any dashboard page. Then check with a teacher who has `stripe_charges_enabled = true`.
**Expected (not connected):** Amber banner visible on every dashboard page. When pending requests exist: "You have N pending request(s)! Connect Stripe to confirm them." When none: "Connect Stripe to start accepting payments from parents." Both variants show "Activate Payments →" link to `/dashboard/connect-stripe`.
**Expected (connected):** No banner visible anywhere in the dashboard.
**Why human:** Requires teacher records with specific `stripe_charges_enabled` states and authenticated session to verify.

---

## Gaps Summary

No automated gaps found. All 12 observable truths verified, all 12 artifacts confirmed substantive and wired, all 9 requirements satisfied, TypeScript compiles clean, 41 tests pass with no failures.

The 6 human verification items are standard behavior/integration checks that require a running app with real Supabase and Resend credentials. They are not implementation gaps — the code is complete and wired correctly.

**One notable deviation from the original plan spec:** The Stripe banner was expanded (post-checkpoint, user-approved) from "show only when pendingCount > 0 AND not connected" to "show whenever not connected with two message variants." This is a UX improvement that goes beyond STRIPE-02's minimum requirement — no gap.

---

_Verified: 2026-03-06_
_Verifier: Claude (gsd-verifier)_
