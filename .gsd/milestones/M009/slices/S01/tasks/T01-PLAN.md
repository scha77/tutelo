---
estimated_steps: 21
estimated_files: 4
skills_used: []
---

# T01: Create recurring_schedules migration and pure date/conflict functions with tests

Create the SQL migration for the `recurring_schedules` table and new columns on `bookings`. Then implement the two pure utility functions (`generateRecurringDates`, `checkDateConflicts`) in `src/lib/utils/recurring.ts` with comprehensive unit tests. These functions are the testable core of the slice — they have zero external dependencies (conflict check queries are mocked in tests).

## Steps

1. Create `supabase/migrations/0014_recurring_schedules.sql`:
   - CREATE TABLE `recurring_schedules` with columns: id (UUID PK), teacher_id (FK teachers), parent_id (FK auth.users, nullable), parent_email (TEXT NOT NULL), frequency (TEXT CHECK IN weekly/biweekly), total_sessions (SMALLINT CHECK 2–26), start_date (DATE), start_time (TIME), end_time (TIME), stripe_customer_id (TEXT), stripe_payment_method_id (TEXT), created_at (TIMESTAMPTZ DEFAULT NOW())
   - ALTER TABLE bookings ADD COLUMN recurring_schedule_id UUID REFERENCES recurring_schedules(id)
   - ALTER TABLE bookings ADD COLUMN is_recurring_first BOOLEAN DEFAULT FALSE
   - CREATE INDEX on bookings(recurring_schedule_id) for S02/S03 queries

2. Create `src/lib/utils/recurring.ts` with:
   - `generateRecurringDates(startDate: string, frequency: 'weekly' | 'biweekly', count: number): string[]` — returns YYYY-MM-DD date strings for N sessions starting from startDate, advancing 7 or 14 days
   - `checkDateConflicts(teacherId: string, dates: string[], startTime: string, endTime: string, supabase: SupabaseClient): Promise<{ available: string[], skipped: { date: string, reason: string }[] }>` — queries bookings for conflicts (non-cancelled status + matching slot) and availability/overrides via per-date getSlotsForDate logic. A date is skipped if (a) an existing booking occupies the slot, or (b) the teacher has no availability window covering startTime–endTime on that date.

3. Create `src/__tests__/recurring-dates.test.ts` testing generateRecurringDates:
   - Weekly: 6 sessions starting 2026-04-07 → correct Tuesdays
   - Biweekly: 4 sessions starting 2026-04-07 → every other Tuesday
   - Edge: count=2 (minimum), count=26 (maximum)
   - Edge: month/year boundary crossing

4. Create `src/__tests__/recurring-conflicts.test.ts` testing checkDateConflicts:
   - Mock Supabase: existing booking on one date → that date skipped with reason 'already booked'
   - Mock Supabase: teacher has no availability on one date → that date skipped with reason 'not available'
   - Mock Supabase: override blocks one date → that date skipped
   - All dates clear → all returned as available
   - All dates conflicted → empty available, all skipped

## Inputs

- ``supabase/migrations/0001_initial_schema.sql` — bookings table definition and bookings_unique_slot constraint`
- ``src/lib/utils/slots.ts` — getSlotsForDate function for availability checking pattern`
- ``src/__tests__/payment-intent.test.ts` — Supabase mock pattern (vi.hoisted, chainable vi.fn)`

## Expected Output

- ``supabase/migrations/0014_recurring_schedules.sql` — recurring_schedules table + bookings columns`
- ``src/lib/utils/recurring.ts` — generateRecurringDates and checkDateConflicts functions`
- ``src/__tests__/recurring-dates.test.ts` — unit tests for date generation`
- ``src/__tests__/recurring-conflicts.test.ts` — unit tests for conflict detection`

## Verification

npx vitest run recurring-dates recurring-conflicts --reporter=verbose && npx tsc --noEmit
