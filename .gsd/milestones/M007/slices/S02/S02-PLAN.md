# S02: Waitlist Dashboard + Notifications

**Goal:** Complete the waitlist loop: dashboard management for teachers, automatic email notifications when capacity frees up on cancellation.
**Demo:** After this: Teacher opens /dashboard/waitlist and sees parents who joined the waitlist (email, join date, notified status). Teacher can remove entries. When teacher cancels a confirmed booking that frees capacity below the limit, all unnotified waitlisted parents receive an email with a direct booking link.

## Tasks
- [x] **T01: Build waitlist notification pipeline: email component, sender, checkAndNotifyWaitlist utility, cancelSession hook, and unit tests** — Create the full notification infrastructure for waitlist parents: a React Email component, sender function in email.ts, the checkAndNotifyWaitlist utility that re-checks capacity and sends emails with batch notified_at stamping, the fire-and-forget hook in cancelSession, and comprehensive unit tests for both the utility and the cancel-session integration.

Steps:
1. Create `src/emails/WaitlistNotificationEmail.tsx` — React Email component following SessionCompleteEmail pattern (same container styles). Props: teacherName + bookingLink. CTA button: 'Book a Session'.
2. Add `sendWaitlistNotificationEmail(parentEmail, teacherName, teacherSlug)` to `src/lib/email.ts` — import WaitlistNotificationEmail, construct bookingLink from NEXT_PUBLIC_APP_URL + slug, send via resend.emails.send.
3. Create `src/lib/utils/waitlist.ts` — export `checkAndNotifyWaitlist(teacherId)`: fetch teacher (capacity_limit, slug, full_name) via supabaseAdmin → if no capacity_limit return early → call getCapacityStatus → if still at capacity return → fetch unnotified waitlist entries → send email per entry with per-entry try/catch → accumulate notifiedIds → batch-stamp notified_at via .in('id', notifiedIds). Wrap entire function in try/catch with console.error.
4. In `src/actions/bookings.ts`, add after the sendSmsCancellation fire-and-forget: `const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist'); checkAndNotifyWaitlist(teacher.id).catch(console.error)` — dynamic import matches existing pattern.
5. Create `tests/unit/waitlist-notify.test.ts` — 7 tests: early return on null capacity_limit, early return on teacher not found, early return when still at capacity, happy path sends emails + batch stamps, early return on empty waitlist, stamps only successful entries when one email fails, logs top-level error on unexpected failure.
6. Update `src/__tests__/cancel-session.test.ts` — add `vi.mock('@/lib/utils/waitlist')` mock + re-application in beforeEach, add test asserting checkAndNotifyWaitlist is called with teacher.id on happy path.
  - Estimate: 45m
  - Files: src/emails/WaitlistNotificationEmail.tsx, src/lib/email.ts, src/lib/utils/waitlist.ts, src/actions/bookings.ts, tests/unit/waitlist-notify.test.ts, src/__tests__/cancel-session.test.ts
  - Verify: npx vitest run tests/unit/waitlist-notify.test.ts && npx vitest run src/__tests__/cancel-session.test.ts
- [x] **T02: Build waitlist dashboard page with nav entry, server action for entry deletion, and WaitlistEntryRow client component** — Create the /dashboard/waitlist teacher-facing page, the removeWaitlistEntry server action, the WaitlistEntryRow client component, and the Waitlist nav item.

Steps:
1. In `src/lib/nav.ts`, add `ListOrdered` to lucide-react imports. Insert `{ href: '/dashboard/waitlist', label: 'Waitlist', icon: ListOrdered }` into navItems array between Students (index 3) and Page (index 4).
2. Create `src/actions/waitlist.ts` — 'use server' file exporting `removeWaitlistEntry(entryId: string)`. Auth: getClaims() → teacher lookup → `.delete().eq('id', entryId).eq('teacher_id', teacher.id)` → revalidatePath('/dashboard/waitlist') → return { success: true } or { error }. Teacher_id guard prevents cross-teacher deletion.
3. Create `src/components/dashboard/WaitlistEntryRow.tsx` — 'use client' component. Props: entry (id, parent_email, created_at, notified_at) + removeAction. Uses useTransition for pending state, window.confirm for deletion confirmation, toast.success/error for feedback. Shows email, join date, notified status badge (green 'Notified' vs grey 'Pending'), and red 'Remove' button.
4. Create `src/app/(dashboard)/dashboard/waitlist/page.tsx` — RSC page. Auth: getUser() → teacher lookup (select id, capacity_limit) → query waitlist entries ordered by created_at ascending. Three states: capacity_limit null → show link to Settings, empty waitlist → 'No one on your waitlist yet', entries → map WaitlistEntryRow with removeWaitlistEntry action prop.
5. Verify: `npx tsc --noEmit` shows no S02-related errors; `npm run build` passes with /dashboard/waitlist in route manifest.
  - Estimate: 30m
  - Files: src/lib/nav.ts, src/actions/waitlist.ts, src/components/dashboard/WaitlistEntryRow.tsx, src/app/(dashboard)/dashboard/waitlist/page.tsx
  - Verify: npx tsc --noEmit 2>&1 | grep -v session-types && npm run build 2>&1 | grep -q 'dashboard/waitlist'
