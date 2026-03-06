---
phase: 02-booking-requests
plan: "01"
subsystem: booking-core
tags: [booking, forms, server-actions, supabase-rpc, zod, calendar]
dependency_graph:
  requires: [01-05]
  provides: [02-02, 02-03]
  affects: [src/app/[slug]/page.tsx, BookingCalendar]
tech_stack:
  added: []
  patterns: [supabase-rpc-atomic-insert, server-action-prop-callback, zod-v4-schema]
key_files:
  created:
    - supabase/migrations/0003_create_booking_fn.sql
    - src/lib/schemas/booking.ts
    - src/actions/bookings.ts
    - tests/bookings/booking-schema.test.ts
    - tests/bookings/booking-action.test.ts
    - tests/bookings/booking-calendar.test.tsx
  modified:
    - src/components/profile/BookingCalendar.tsx
    - src/app/[slug]/page.tsx
decisions:
  - "BookingResult union type exported from actions/bookings.ts so BookingCalendar can import it safely as a type-only import"
  - "Zod v4 stricter UUID validation requires RFC 4122-compliant UUIDs in tests (e.g. 550e8400-e29b-41d4-a716-446655440000)"
  - "Dynamic import of @/lib/email with @ts-expect-error suppresses TS error for intentionally-missing Plan 02-03 module"
  - "create_booking() adds belt-and-suspenders published check inside function in addition to RLS policy"
metrics:
  duration: 4 min
  completed_date: "2026-03-06"
  tasks_completed: 3
  files_changed: 8
---

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
