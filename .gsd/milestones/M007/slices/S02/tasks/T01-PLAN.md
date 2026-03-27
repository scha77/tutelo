---
estimated_steps: 8
estimated_files: 6
skills_used: []
---

# T01: Build waitlist notification pipeline: email component, sender, checkAndNotifyWaitlist utility, cancelSession hook, and unit tests

Create the full notification infrastructure for waitlist parents: a React Email component, sender function in email.ts, the checkAndNotifyWaitlist utility that re-checks capacity and sends emails with batch notified_at stamping, the fire-and-forget hook in cancelSession, and comprehensive unit tests for both the utility and the cancel-session integration.

Steps:
1. Create `src/emails/WaitlistNotificationEmail.tsx` — React Email component following SessionCompleteEmail pattern (same container styles). Props: teacherName + bookingLink. CTA button: 'Book a Session'.
2. Add `sendWaitlistNotificationEmail(parentEmail, teacherName, teacherSlug)` to `src/lib/email.ts` — import WaitlistNotificationEmail, construct bookingLink from NEXT_PUBLIC_APP_URL + slug, send via resend.emails.send.
3. Create `src/lib/utils/waitlist.ts` — export `checkAndNotifyWaitlist(teacherId)`: fetch teacher (capacity_limit, slug, full_name) via supabaseAdmin → if no capacity_limit return early → call getCapacityStatus → if still at capacity return → fetch unnotified waitlist entries → send email per entry with per-entry try/catch → accumulate notifiedIds → batch-stamp notified_at via .in('id', notifiedIds). Wrap entire function in try/catch with console.error.
4. In `src/actions/bookings.ts`, add after the sendSmsCancellation fire-and-forget: `const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist'); checkAndNotifyWaitlist(teacher.id).catch(console.error)` — dynamic import matches existing pattern.
5. Create `tests/unit/waitlist-notify.test.ts` — 7 tests: early return on null capacity_limit, early return on teacher not found, early return when still at capacity, happy path sends emails + batch stamps, early return on empty waitlist, stamps only successful entries when one email fails, logs top-level error on unexpected failure.
6. Update `src/__tests__/cancel-session.test.ts` — add `vi.mock('@/lib/utils/waitlist')` mock + re-application in beforeEach, add test asserting checkAndNotifyWaitlist is called with teacher.id on happy path.

## Inputs

- ``src/emails/SessionCompleteEmail.tsx` — template pattern for React Email component styling`
- ``src/lib/email.ts` — existing email module to extend with sendWaitlistNotificationEmail`
- ``src/lib/utils/capacity.ts` — getCapacityStatus imported by checkAndNotifyWaitlist`
- ``src/lib/supabase/service.ts` — supabaseAdmin used for waitlist queries and notified_at stamps`
- ``src/actions/bookings.ts` — cancelSession function to hook checkAndNotifyWaitlist into`
- ``src/__tests__/cancel-session.test.ts` — existing test file to extend with waitlist mock + assertion`
- ``tests/unit/capacity.test.ts` — test pattern reference for mocked Supabase utilities`

## Expected Output

- ``src/emails/WaitlistNotificationEmail.tsx` — new React Email component`
- ``src/lib/email.ts` — modified with sendWaitlistNotificationEmail export + WaitlistNotificationEmail import`
- ``src/lib/utils/waitlist.ts` — new utility with checkAndNotifyWaitlist export`
- ``src/actions/bookings.ts` — modified with checkAndNotifyWaitlist fire-and-forget in cancelSession`
- ``tests/unit/waitlist-notify.test.ts` — new test file with 7 passing tests`
- ``src/__tests__/cancel-session.test.ts` — modified with waitlist mock + checkAndNotifyWaitlist assertion test`

## Verification

npx vitest run tests/unit/waitlist-notify.test.ts && npx vitest run src/__tests__/cancel-session.test.ts
