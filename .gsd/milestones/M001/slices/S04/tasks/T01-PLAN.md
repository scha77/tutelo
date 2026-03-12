# T01: 04-direct-booking-parent-account 01

**Slice:** S04 — **Milestone:** M001

## Description

Lay the foundation for Phase 4: run the DB migration that adds `reminder_sent_at` to bookings, then scaffold all 7 Wave-0 test files as green `it.todo()` stubs.

Purpose: Later plans (02, 03, 04) can all run in parallel in Wave 2 without worrying about the schema column or missing test files.
Output: 0005 migration SQL + 7 test stub files. Full vitest suite green.

## Must-Haves

- [ ] "bookings table has reminder_sent_at TIMESTAMPTZ column with index"
- [ ] "All 7 test stub files exist and run green with it.todo() stubs"
- [ ] "npx vitest run passes with no failures after migration scaffold"

## Files

- `supabase/migrations/0005_phase4_direct_booking.sql`
- `src/__tests__/booking-routing.test.ts`
- `src/__tests__/payment-intent.test.ts`
- `src/__tests__/webhook-capture.test.ts`
- `src/__tests__/parent-auth.test.ts`
- `src/__tests__/parent-account.test.ts`
- `src/__tests__/rebook.test.ts`
- `src/__tests__/reminders.test.ts`
