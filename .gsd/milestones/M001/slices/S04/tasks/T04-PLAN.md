# T04: 04-direct-booking-parent-account 04

**Slice:** S04 — **Milestone:** M001

## Description

Implement the 24-hour session reminder system (NOTIF-04): `SessionReminderEmail` react-email template, `sendSessionReminderEmail` function in email.ts, the nightly cron endpoint at `/api/cron/session-reminders`, and the `vercel.json` cron schedule entry.

Purpose: Both teacher and parent receive a reminder the day before their session — reduces no-shows. The `reminder_sent_at` column (added in Plan 01 migration) provides idempotency so a daily cron run cannot double-send.
Output: Nightly cron live in production sending reminder emails to both parties.

## Must-Haves

- [ ] "Both teacher and parent receive a reminder email the day before their confirmed session"
- [ ] "Nightly cron at 9 AM UTC finds sessions with booking_date = tomorrow (UTC) and status = confirmed and reminder_sent_at IS NULL"
- [ ] "Cron run is idempotent: second run does not send duplicate emails (reminder_sent_at guard)"
- [ ] "Cron endpoint is protected by CRON_SECRET Bearer token"
- [ ] "vercel.json has session-reminders cron at 0 9 * * * schedule"

## Files

- `src/emails/SessionReminderEmail.tsx`
- `src/lib/email.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `vercel.json`
- `src/__tests__/reminders.test.ts`
