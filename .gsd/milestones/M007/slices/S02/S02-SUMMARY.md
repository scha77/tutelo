---
id: S02
parent: M007
milestone: M007
provides:
  - checkAndNotifyWaitlist(teacherId) utility — callable from any future cancellation or capacity-freeing event
  - removeWaitlistEntry server action — ownership-gated deletion, revalidates /dashboard/waitlist
  - /dashboard/waitlist RSC page — fully functional waitlist management with three states
  - WaitlistNotificationEmail React Email template — reusable for future waitlist-related notifications
  - Waitlist nav item in shared navItems array — auto-renders in both Sidebar and MobileBottomNav
requires:
  - slice: S01
    provides: waitlist table schema (id, teacher_id, parent_email, created_at, notified_at); getCapacityStatus utility; capacity_limit on teachers table
affects:
  - S03 — session-types.ts Zod fix (this slice) unblocks clean TypeScript compilation; checkAndNotifyWaitlist is reusable if session cancellation is added in S03
key_files:
  - src/emails/WaitlistNotificationEmail.tsx
  - src/lib/email.ts
  - src/lib/utils/waitlist.ts
  - src/actions/bookings.ts
  - src/actions/waitlist.ts
  - src/lib/nav.ts
  - src/components/dashboard/WaitlistEntryRow.tsx
  - src/app/(dashboard)/dashboard/waitlist/page.tsx
  - tests/unit/waitlist-notify.test.ts
  - src/__tests__/cancel-session.test.ts
key_decisions:
  - Dynamic import + fire-and-forget pattern for checkAndNotifyWaitlist in cancelSession — notification failures must never block the cancellation response
  - Batch notified_at stamping via notifiedIds accumulator — stamp only successful sends in one DB call (not per-entry, not pre-send)
  - getClaims() in server action / getUser() in RSC page — consistent with established codebase convention split
  - Zod .issues[0].message (not .errors) for ZodError message extraction — fixed pre-existing S03 code during slice verification
patterns_established:
  - Fire-and-forget notification pipeline: dynamic import + .catch(console.error) in server actions for non-blocking post-action work
  - Batch-stamp pattern: accumulate successful operation IDs in an array, then single .in('id', ids) DB call — minimizes round trips while marking only successes
  - Two-level error logging for async pipelines: per-entry try/catch logs context (teacher_id + parent_email), outer try/catch logs function-level failure (teacher_id only)
  - RSC page three-state guard pattern: null capacity_limit → settings link, enabled but empty → empty state, entries present → list
  - Server action auth split: getClaims() for server actions, getUser() for RSC pages — consistent with bookings.ts and students/page.tsx respectively
observability_surfaces:
  - [waitlist] checkAndNotifyWaitlist failed — top-level catch in waitlist.ts, includes teacher_id
  - [waitlist] Failed to send notification — per-entry catch in waitlist.ts, includes teacher_id + parent_email
  - notified_at timestamp on waitlist entries — inspectable via /dashboard/waitlist page notified status badge or directly in DB
  - Vitest test suite: 16 passing tests covering all notification pipeline branches
drill_down_paths:
  - milestones/M007/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M007/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-27T02:05:25.192Z
blocker_discovered: false
---

# S02: Waitlist Dashboard + Notifications

**Delivered the full waitlist loop: /dashboard/waitlist management page, removeWaitlistEntry server action, WaitlistNotificationEmail pipeline with checkAndNotifyWaitlist, and cancelSession fire-and-forget hook — all verified with 16 passing tests and a clean production build.**

## What Happened

S02 completed the waitlist feature loop established in S01. Two tasks were executed sequentially by executor agents, each leaving verified artifacts.

**T01 — Notification Pipeline:**
The full email notification infrastructure was built across 4 production files:
- `WaitlistNotificationEmail.tsx`: React Email component following the SessionCompleteEmail pattern. Props: teacherName + bookingLink. Subject line: "A spot just opened up — book with {teacherName}". Footer explains waitlist origin.
- `email.ts`: Added `sendWaitlistNotificationEmail(parentEmail, teacherName, teacherSlug)`. Constructs bookingLink from `NEXT_PUBLIC_APP_URL` + slug. Delegates to `resend.emails.send()` with the new template.
- `waitlist.ts` (new utility): `checkAndNotifyWaitlist(teacherId)` implements the full pipeline — fetch teacher → check capacity via `getCapacityStatus` → early return if still at capacity or no capacity limit → fetch unnotified waitlist entries → per-entry email with individual try/catch → accumulate notifiedIds → batch-stamp `notified_at` in a single DB call. Two-level error logging: per-entry `[waitlist] Failed to send notification` (includes teacher_id + parent_email) and top-level `[waitlist] checkAndNotifyWaitlist failed` (includes teacher_id). Top-level try/catch prevents cascade failures.
- `bookings.ts`: Hooked `checkAndNotifyWaitlist(teacher.id)` into `cancelSession` after the SMS fire-and-forget block, using dynamic import + `.catch(console.error)` — identical pattern to existing email/SMS fire-and-forget calls.

16 tests covering the pipeline: 7 unit tests in `waitlist-notify.test.ts` (null capacity_limit early return, teacher not found, still at capacity, happy path 2-entry batch, empty entries, partial failure stamps only success, top-level error logging) and 9 tests in `cancel-session.test.ts` (8 pre-existing + 1 new asserting checkAndNotifyWaitlist is called with teacher.id on happy path).

**T02 — Dashboard Page:**
4 files comprising the teacher-facing management surface:
- `nav.ts`: Added `ListOrdered` icon and `{ href: '/dashboard/waitlist', label: 'Waitlist', icon: ListOrdered }` between Students (index 3) and Page (index 4). Both Sidebar and MobileBottomNav render from this shared array automatically.
- `actions/waitlist.ts`: New `'use server'` file with `removeWaitlistEntry(entryId)`. Uses `getClaims()` for auth (matching bookings.ts server-action pattern), teacher lookup, `.delete().eq('id', entryId).eq('teacher_id', teacher.id)` for ownership-gated deletion, `revalidatePath('/dashboard/waitlist')`, and structured `{ success: true } | { error }` return.
- `WaitlistEntryRow.tsx`: Client component with `useTransition` pending state, `window.confirm` destructive action guard, `toast.success`/`toast.error` feedback, notified status badge (green "Notified" vs muted "Pending" based on `notified_at` presence), and formatted join date.
- `waitlist/page.tsx`: RSC page with three states: (a) `capacity_limit == null` → link to Settings to enable waitlist, (b) capacity set + empty waitlist → "No one on your waitlist yet", (c) entries present → `WaitlistEntryRow` per entry with `removeWaitlistEntry` action prop.

**Build issue fixed during verification:**
Pre-existing S03 code in `session-types.ts` used `parsed.error.errors[0].message` (Zod v3 uses `.issues`, not `.errors`). This caused `npm run build` to fail before S02 files even compiled. Fixed both occurrences (addSessionType + updateSessionType) as a blocking prerequisite for slice verification.

## Verification

All verification checks passed from the M007 worktree (`.gsd/worktrees/M007`):

1. **`npx vitest run tests/unit/waitlist-notify.test.ts`** — 7/7 tests pass (35ms). Covers null capacity_limit early return, teacher not found, still at capacity, happy path batch stamp, empty entries, partial failure stamps only successful sends, top-level error logging.

2. **`npx vitest run src/__tests__/cancel-session.test.ts`** — 9/9 tests pass (101ms). Includes new test asserting `checkAndNotifyWaitlist` is called with `TEACHER_ID` on the cancelSession happy path. The stderr "Error: Email service down" is an intentional test fixture simulating the partial-failure scenario.

3. **`npx tsc --noEmit`** — exits 0 after fixing `session-types.ts` (`.errors` → `.issues`). No S02-related type errors.

4. **`npm run build`** — clean production build. `/dashboard/waitlist` confirmed in route manifest as a dynamic (ƒ) route.

All 16 tests pass. TypeScript clean. Build green. Route present.

## Requirements Advanced

- WAIT-02 — Delivered /dashboard/waitlist RSC page with entry list, notified status badges, and removeWaitlistEntry server action with teacher-gated ownership check
- WAIT-03 — Delivered checkAndNotifyWaitlist utility + WaitlistNotificationEmail + cancelSession hook; 16 tests prove all pipeline branches including partial failure handling

## Requirements Validated

- WAIT-02 — /dashboard/waitlist in route manifest; WaitlistEntryRow renders email/join-date/notified-badge; removeWaitlistEntry deletes with .eq('teacher_id', teacher.id) guard; build passes; tsc clean
- WAIT-03 — 16/16 tests pass including partial-failure scenario; checkAndNotifyWaitlist rechecks capacity, skips if still full, batch-stamps only successful sends; fire-and-forget hook in cancelSession confirmed by integration test

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

1. T02 used `getClaims()` (not `getUser()`) for auth in `removeWaitlistEntry` server action — matches the established bookings.ts server-action pattern vs. the plan's suggestion of `getUser()`. The page itself correctly uses `getUser()`. This is the correct split: RSC pages use `getUser()`, server actions use `getClaims()`.

2. During slice verification, a pre-existing S03 file (`session-types.ts`) caused `npm run build` to fail due to Zod `.errors` vs `.issues`. Fixed as a blocking prerequisite — not a deviation from S02 scope but a necessary unblocking fix.

## Known Limitations

None for S02 scope. The waitlist notification pipeline is feature-complete for the defined requirements.

## Follow-ups

- S03 (Session Types + Variable Pricing) is the next slice. `session-types.ts` server action is already stubbed (fixed during this slice); `SessionTypeManager.tsx` component is also present in the worktree for S03 execution.
- WaitlistNotificationEmail does not include an unsubscribe link — acceptable for MVP transactional email, but should be revisited before high-volume use.
- The `window.confirm` deletion guard in WaitlistEntryRow is functional but not styled. A modal replacement would improve UX consistency with other destructive actions in the app.

## Files Created/Modified

- `src/emails/WaitlistNotificationEmail.tsx` — New React Email component for waitlist spot-opened notifications
- `src/lib/email.ts` — Added sendWaitlistNotificationEmail sender function
- `src/lib/utils/waitlist.ts` — New checkAndNotifyWaitlist utility with full capacity-check + email + batch-stamp pipeline
- `src/actions/bookings.ts` — Added fire-and-forget checkAndNotifyWaitlist hook to cancelSession
- `src/actions/waitlist.ts` — New server action: removeWaitlistEntry with teacher-gated ownership check
- `src/lib/nav.ts` — Added Waitlist nav item between Students and Page
- `src/components/dashboard/WaitlistEntryRow.tsx` — New client component: entry row with notified badge, pending state, confirmation dialog
- `src/app/(dashboard)/dashboard/waitlist/page.tsx` — New RSC page: /dashboard/waitlist with three-state guard
- `tests/unit/waitlist-notify.test.ts` — 7 unit tests for checkAndNotifyWaitlist pipeline
- `src/__tests__/cancel-session.test.ts` — Added waitlist mock + 1 integration test asserting checkAndNotifyWaitlist called on happy path
- `src/actions/session-types.ts` — Fixed pre-existing Zod .errors → .issues (build blocker discovered during S02 verification)
