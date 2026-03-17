---
estimated_steps: 5
estimated_files: 6
---

# T03: CredentialsBar badge gating and cancellation/cron SMS wiring

**Slice:** S01 — SMS Infrastructure & Teacher Phone Collection
**Milestone:** M005

## Description

Fix the hardcoded "Verified Teacher" badge so it only shows for verified teachers, and wire `sendSmsCancellation` into `cancelSession` and `sendSmsReminder` into the session-reminders cron. Update existing test files to mock the new `@/lib/sms` module so all tests continue to pass. This task closes the slice — after it, SMS sends are integrated into both notification paths and the trust badge is honest.

## Steps

1. Fix `CredentialsBar`:
   - Add `isVerified: boolean` to `CredentialsBarProps` interface
   - Wrap the badge div in `{isVerified && (<div className="flex items-center gap-1 text-emerald-600">...</div>)}`
   - In `src/app/[slug]/page.tsx`, pass `isVerified={!!teacher.verified_at}` — the wildcard select already includes all columns so `verified_at` is available after migration
2. Wire SMS into `cancelSession` in `src/actions/bookings.ts`:
   - After the existing `sendCancellationEmail(bookingId).catch(console.error)` line, add:
     ```
     const { sendSmsCancellation } = await import('@/lib/sms')
     sendSmsCancellation(bookingId).catch(console.error)
     ```
   - Same dynamic import + fire-and-forget pattern as email
3. Wire SMS into session-reminders cron in `src/app/api/cron/session-reminders/route.ts`:
   - Add `import { sendSmsReminder } from '@/lib/sms'` at top (static import, same as email)
   - After `await sendSessionReminderEmail(session.id).catch(console.error)`, add `sendSmsReminder(session.id).catch(console.error)`
   - No query changes needed — `sendSmsReminder` does its own `supabaseAdmin` fetch internally
4. Update `src/__tests__/cancel-session.test.ts`:
   - Add `vi.mock('@/lib/sms', () => ({ sendSmsCancellation: vi.fn().mockResolvedValue(undefined) }))` alongside existing `@/lib/email` mock
   - Also add the mock in the `beforeEach` `vi.resetModules()` re-application block if present
   - Run all 8 tests — should pass unchanged since SMS is fire-and-forget
5. Update `src/__tests__/reminders.test.ts`:
   - Add `const { mockSendSmsReminder } = vi.hoisted(() => { const mockSendSmsReminder = vi.fn().mockResolvedValue(undefined); return { mockSendSmsReminder } })`
   - Add `vi.mock('@/lib/sms', () => ({ sendSmsReminder: mockSendSmsReminder, sendSmsCancellation: vi.fn().mockResolvedValue(undefined) }))`
   - Add assertion in the happy-path test: `expect(mockSendSmsReminder).toHaveBeenCalledWith(expect.any(String))`
   - Run all tests — should pass

## Must-Haves

- [ ] CredentialsBar only renders "Verified Teacher" badge when `isVerified === true`
- [ ] `[slug]/page.tsx` passes `isVerified={!!teacher.verified_at}` to CredentialsBar
- [ ] `cancelSession` calls `sendSmsCancellation(bookingId)` fire-and-forget after email
- [ ] Session-reminders cron calls `sendSmsReminder(session.id)` after email in the loop
- [ ] `cancel-session.test.ts` mocks `@/lib/sms` — all 8 tests pass
- [ ] `reminders.test.ts` mocks `@/lib/sms` + asserts SMS called — all tests pass
- [ ] `npm run build` passes with zero errors

## Verification

- `npx vitest run src/__tests__/cancel-session.test.ts` — all 8 pass
- `npx vitest run src/__tests__/reminders.test.ts` — all pass with SMS assertion
- `npx vitest run src/__tests__/sms.test.ts` — still passes (regression)
- `npm run build` — zero errors
- Code review: CredentialsBar badge wrapped in `{isVerified && ...}` conditional

## Observability Impact

- Signals added/changed: `cancelSession` now logs `[sms]` skip/error via sms.ts internal logging; cron now logs same for each session
- How a future agent inspects this: grep for `[sms]` in cron/action logs; check Twilio dashboard for message delivery status
- Failure state exposed: SMS failures logged but non-blocking — email delivery is unaffected; badge state visible on public profile page

## Inputs

- `src/lib/sms.ts` — T01 output (sendSmsReminder, sendSmsCancellation)
- `src/components/profile/CredentialsBar.tsx` — hardcoded badge to fix
- `src/app/[slug]/page.tsx` — passes teacher to CredentialsBar
- `src/actions/bookings.ts` — cancelSession with email fire-and-forget pattern
- `src/app/api/cron/session-reminders/route.ts` — cron loop with email call
- `src/__tests__/cancel-session.test.ts` — 8 existing tests to keep passing
- `src/__tests__/reminders.test.ts` — existing tests to keep passing + add SMS assertion

## Expected Output

- `src/components/profile/CredentialsBar.tsx` — badge gated on `isVerified` prop
- `src/app/[slug]/page.tsx` — passes `isVerified={!!teacher.verified_at}`
- `src/actions/bookings.ts` — `cancelSession` calls `sendSmsCancellation` after email
- `src/app/api/cron/session-reminders/route.ts` — cron calls `sendSmsReminder` after email
- `src/__tests__/cancel-session.test.ts` — mocks `@/lib/sms`, all 8 tests pass
- `src/__tests__/reminders.test.ts` — mocks `@/lib/sms`, SMS assertion added, all tests pass
