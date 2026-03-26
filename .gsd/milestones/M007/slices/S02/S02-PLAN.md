# S02: Waitlist Dashboard + Notifications

**Goal:** Teacher views their waitlist in the dashboard — sees parent emails and join dates, can remove entries. When a confirmed booking is cancelled and capacity frees up, all unnotified waitlisted parents receive a notification email with a direct booking link.
**Demo:** Teacher views their waitlist in the dashboard — sees parent emails and join dates, can remove entries. Teacher cancels a confirmed booking that was keeping them at capacity. System re-checks active student count, finds capacity freed, and sends a notification email to all unnotified waitlisted parents with a direct booking link to the teacher's profile.

## Must-Haves

- **Must-Haves:**
- Teacher sees `/dashboard/waitlist` page listing waitlist entries (email, join date, notified status) with delete capability
- `removeWaitlistEntry(entryId)` server action deletes a waitlist row (teacher-gated)
- Waitlist nav item appears in sidebar and mobile nav between Students and Settings
- `WaitlistNotificationEmail` React Email component renders with teacher name and booking link CTA
- `sendWaitlistNotificationEmail(parentEmail, teacherName, teacherSlug)` in `src/lib/email.ts`
- `checkAndNotifyWaitlist(teacherId)` utility: rechecks capacity after cancellation, sends notification emails to unnotified waitlist entries, batch-stamps `notified_at`
- `cancelSession` calls `checkAndNotifyWaitlist` as fire-and-forget after SMS notification
- Per-entry error handling in notification loop (one bad email doesn't block others)
- Unit tests for `checkAndNotifyWaitlist` covering: capacity still full (no emails), capacity freed (emails sent + notified_at stamped), no unnotified entries (no-op), individual send failure resilience
- Cancel-session test suite extended with assertion that `checkAndNotifyWaitlist` is called on happy path
- **Proof Level:**
- This slice proves: integration (cancelSession → checkAndNotifyWaitlist → email send → notified_at stamp)
- Real runtime required: no (mocked Supabase + Resend in tests)
- Human/UAT required: yes (manual smoke of dashboard page after deploy)
- **Verification:**
- `npx vitest run tests/unit/waitlist-notify.test.ts` — all tests pass
- `npx vitest run src/__tests__/cancel-session.test.ts` — all tests pass (existing + new)
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0, `/dashboard/waitlist` in route manifest

## Proof Level

- This slice proves: integration — cancelSession → checkAndNotifyWaitlist → email send → notified_at stamp, verified via unit tests with mocked Supabase and Resend

## Integration Closure

- Upstream surfaces consumed: `waitlist` table (S01), `getCapacityStatus()` from `src/lib/utils/capacity.ts` (S01), `supabaseAdmin` from `src/lib/supabase/service.ts`, `cancelSession` in `src/actions/bookings.ts`, fire-and-forget email pattern from `src/lib/email.ts`
- New wiring introduced: `checkAndNotifyWaitlist()` fire-and-forget call inside `cancelSession`; Waitlist nav item; `/dashboard/waitlist` route
- What remains before milestone is truly usable: S03 (session types + variable pricing) — independent of waitlist

## Verification

- Runtime signals: `console.error('[waitlist] checkAndNotifyWaitlist failed', { teacher_id, error })` on top-level failure; per-entry `console.error('[waitlist] Failed to send notification', { teacher_id, parent_email, error })` on individual email failure
- Inspection surfaces: `waitlist` table `notified_at` column shows which parents were notified and when; `/dashboard/waitlist` page shows notified status per entry
- Failure visibility: per-entry error logging with teacher_id context; top-level catch prevents cascade; fire-and-forget wrapper in cancelSession isolates notification failures from cancellation flow
- Redaction constraints: parent_email logged only in per-entry send failures (necessary for debugging); teacher_id always logged

## Tasks

- [ ] **T01: Build waitlist notification pipeline (email + utility + cancelSession hook + tests)** `est:1h30m`
  Create the WaitlistNotificationEmail React Email component, add sendWaitlistNotificationEmail() to email.ts, implement checkAndNotifyWaitlist() utility in a new waitlist.ts, hook it into cancelSession as fire-and-forget, and write comprehensive unit tests for both the utility and the cancel-session integration.
  - Files: `src/emails/WaitlistNotificationEmail.tsx`, `src/lib/email.ts`, `src/lib/utils/waitlist.ts`, `src/actions/bookings.ts`, `tests/unit/waitlist-notify.test.ts`, `src/__tests__/cancel-session.test.ts`
  - Verify: npx vitest run tests/unit/waitlist-notify.test.ts && npx vitest run src/__tests__/cancel-session.test.ts && npx tsc --noEmit

- [ ] **T02: Build waitlist dashboard page with nav entry and delete action** `est:1h`
  Create the /dashboard/waitlist RSC page listing waitlist entries, a removeWaitlistEntry server action, a WaitlistEntryRow client component with delete + pending state, and add the Waitlist nav item between Students and Settings.
  - Files: `src/app/(dashboard)/dashboard/waitlist/page.tsx`, `src/actions/waitlist.ts`, `src/components/dashboard/WaitlistEntryRow.tsx`, `src/lib/nav.ts`
  - Verify: npx tsc --noEmit && npm run build | grep -q 'dashboard/waitlist'

## Files Likely Touched

- src/emails/WaitlistNotificationEmail.tsx
- src/lib/email.ts
- src/lib/utils/waitlist.ts
- src/actions/bookings.ts
- tests/unit/waitlist-notify.test.ts
- src/__tests__/cancel-session.test.ts
- src/app/(dashboard)/dashboard/waitlist/page.tsx
- src/actions/waitlist.ts
- src/components/dashboard/WaitlistEntryRow.tsx
- src/lib/nav.ts
