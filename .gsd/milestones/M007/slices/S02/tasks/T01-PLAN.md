---
estimated_steps: 6
estimated_files: 6
skills_used: []
---

# T01: Build waitlist notification pipeline (email + utility + cancelSession hook + tests)

Create the full notification pipeline: a React Email component for waitlist notifications, a sender function in email.ts, a `checkAndNotifyWaitlist()` utility that rechecks capacity after booking cancellation and sends notification emails to unnotified waitlisted parents, hook it into `cancelSession` as fire-and-forget, and write unit tests for the utility and extend cancel-session tests.

This task delivers requirements WAIT-03 (waitlisted parents auto-notified via email with direct booking link when capacity frees up) and the notification infrastructure for WAIT-02.

## Steps

1. **Create `src/emails/WaitlistNotificationEmail.tsx`** — React Email component following the `SessionCompleteEmail.tsx` pattern exactly (same container styles: maxWidth 520px, #ffffff bg, #e5e7eb border, sans-serif font). Props: `{ teacherName: string, bookingLink: string }`. Subject line: "A spot just opened up — book with {teacherName}". Body: short message about a spot opening up. CTA Button: "Book a Session" linking to `bookingLink`. Footer: "You're receiving this because you joined the waitlist..." Use `@react-email/components` imports: `Body, Button, Container, Head, Hr, Html, Preview, Section, Text`.

2. **Add `sendWaitlistNotificationEmail()` to `src/lib/email.ts`** — Export a new async function with signature: `sendWaitlistNotificationEmail(parentEmail: string, teacherName: string, teacherSlug: string): Promise<void>`. Build `bookingLink` from `process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'` + `/${teacherSlug}`. Call `resend.emails.send()` with `from: 'Tutelo <noreply@tutelo.app>'`, `to: parentEmail`, the subject line, and `react: WaitlistNotificationEmail({ teacherName, bookingLink })`. Import `WaitlistNotificationEmail` at the top of the file alongside the other email imports.

3. **Create `src/lib/utils/waitlist.ts`** — New file exporting `checkAndNotifyWaitlist(teacherId: string): Promise<void>`. Implementation:
   - Import `supabaseAdmin` from `@/lib/supabase/service`
   - Import `getCapacityStatus` from `@/lib/utils/capacity`
   - Import `sendWaitlistNotificationEmail` from `@/lib/email`
   - Fetch teacher row via `supabaseAdmin.from('teachers').select('capacity_limit, slug, full_name').eq('id', teacherId).single()`. If no teacher or `capacity_limit` is null, return early.
   - Call `getCapacityStatus(supabaseAdmin, teacherId, teacher.capacity_limit)`. If still at capacity, return early (no spot freed).
   - Fetch unnotified waitlist entries: `supabaseAdmin.from('waitlist').select('id, parent_email').eq('teacher_id', teacherId).is('notified_at', null)`. If empty, return early.
   - Loop through entries. For each, try `await sendWaitlistNotificationEmail(entry.parent_email, teacher.full_name, teacher.slug)`. On success, add entry.id to `notifiedIds` array. On failure, `console.error('[waitlist] Failed to send notification', { teacher_id: teacherId, parent_email: entry.parent_email, error })` and continue to next entry.
   - After loop, batch-stamp notified_at: `supabaseAdmin.from('waitlist').update({ notified_at: new Date().toISOString() }).in('id', notifiedIds)`.
   - Wrap entire function body in try/catch with `console.error('[waitlist] checkAndNotifyWaitlist failed', { teacher_id: teacherId, error })`.

4. **Hook into `cancelSession` in `src/actions/bookings.ts`** — After the existing `sendSmsCancellation` fire-and-forget block (the line `sendSmsCancellation(bookingId).catch(console.error)`), add:
   ```ts
   // Notify waitlisted parents if capacity freed — fire and forget
   const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
   checkAndNotifyWaitlist(teacher.id).catch(console.error)
   ```
   Use dynamic import (matching the pattern of `sendCancellationEmail` and `sendSmsCancellation` imports). `teacher.id` is already in scope from the teacher lookup earlier in the function.

5. **Create `tests/unit/waitlist-notify.test.ts`** — Unit tests for `checkAndNotifyWaitlist` using the mock pattern from `tests/unit/capacity.test.ts`. Mock `@/lib/supabase/service` (supabaseAdmin), `@/lib/email` (sendWaitlistNotificationEmail), and `@/lib/utils/capacity` (getCapacityStatus). Test cases:
   - Teacher has no capacity_limit (null) → returns early, no emails sent
   - Teacher still at capacity after cancellation → returns early, no emails sent
   - Capacity freed, 2 unnotified entries → both emails sent with correct args (teacherName, slug), notified_at batch-updated on both IDs
   - Capacity freed but no unnotified entries → no emails sent, no update call
   - One email fails, one succeeds → successful entry's ID still stamped, failed entry not stamped, error logged
   - Teacher not found in DB → returns early, no crash

6. **Extend `src/__tests__/cancel-session.test.ts`** — Add a new `vi.mock('@/lib/utils/waitlist', ...)` mock at the top-level AND in the `beforeEach` re-application block (the test uses `vi.resetModules()` in beforeEach, so all mocks must be re-declared). Add one test: "calls checkAndNotifyWaitlist on happy path" — assert that after a successful `cancelSession`, `checkAndNotifyWaitlist` was called with `TEACHER_ID`. The mock should return a resolved promise.

## Must-Haves

- [ ] `WaitlistNotificationEmail` renders with teacherName and bookingLink CTA button
- [ ] `sendWaitlistNotificationEmail()` exported from `src/lib/email.ts`, calls resend.emails.send
- [ ] `checkAndNotifyWaitlist()` rechecks capacity via `getCapacityStatus(supabaseAdmin, ...)`, short-circuits if still at capacity or no unnotified entries
- [ ] Per-entry error handling: one bad email doesn't prevent others from being sent
- [ ] Batch `notified_at` update stamps only successfully-notified entry IDs
- [ ] `cancelSession` calls `checkAndNotifyWaitlist(teacher.id)` via dynamic import + `.catch(console.error)` fire-and-forget pattern
- [ ] All waitlist-notify unit tests pass (≥5 test cases)
- [ ] Cancel-session test suite passes including new `checkAndNotifyWaitlist` assertion
- [ ] `npx tsc --noEmit` exits 0

## Inputs

- `src/lib/email.ts` — existing email module to extend with new sender function
- `src/lib/utils/capacity.ts` — `getCapacityStatus()` used by checkAndNotifyWaitlist
- `src/lib/supabase/service.ts` — `supabaseAdmin` service-role client (env var: `SUPABASE_SERVICE_SECRET_KEY`)
- `src/actions/bookings.ts` — `cancelSession` function to hook into (add fire-and-forget call after SMS)
- `src/__tests__/cancel-session.test.ts` — existing test file to extend (uses `vi.resetModules()` + re-applied mocks in `beforeEach`)
- `tests/unit/capacity.test.ts` — reference for `makeMockSupabase()` test helper pattern
- `src/emails/SessionCompleteEmail.tsx` — reference for React Email component structure and styling

## Expected Output

- `src/emails/WaitlistNotificationEmail.tsx` — new React Email component
- `src/lib/utils/waitlist.ts` — new utility with `checkAndNotifyWaitlist(teacherId)`
- `src/lib/email.ts` — modified: new `sendWaitlistNotificationEmail()` export + import
- `src/actions/bookings.ts` — modified: fire-and-forget `checkAndNotifyWaitlist` call in `cancelSession`
- `tests/unit/waitlist-notify.test.ts` — new: ≥5 unit tests for checkAndNotifyWaitlist
- `src/__tests__/cancel-session.test.ts` — modified: new test asserting checkAndNotifyWaitlist called

## Verification

```
npx vitest run tests/unit/waitlist-notify.test.ts && npx vitest run src/__tests__/cancel-session.test.ts && npx tsc --noEmit
```

## Observability Impact

- Signals added: `console.error('[waitlist] checkAndNotifyWaitlist failed', { teacher_id, error })` top-level catch; `console.error('[waitlist] Failed to send notification', { teacher_id, parent_email, error })` per-entry email failure
- How a future agent inspects: query `waitlist` table for `notified_at IS NOT NULL` to see who was notified; grep server logs for `[waitlist]` prefix
- Failure state exposed: individual email send failures logged with teacher_id + parent_email; top-level failure logged with teacher_id; fire-and-forget wrapper in cancelSession prevents notification failures from blocking cancellation
