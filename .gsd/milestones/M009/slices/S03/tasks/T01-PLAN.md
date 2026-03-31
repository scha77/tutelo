---
estimated_steps: 24
estimated_files: 4
skills_used: []
---

# T01: Add cancel_token migration, generate token in create-recurring, add manageUrl to confirmation email

Foundation task: creates the cancel_token column on recurring_schedules, generates the token at booking creation time, and adds the manage URL to the parent confirmation email. This unblocks both T02 (needs the column for series cancel queries) and T03 (needs the token for the /manage page).

## Steps

1. Create `supabase/migrations/0016_cancel_token.sql`:
   - `ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE`
   - `ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS cancel_token_created_at TIMESTAMPTZ`
   - `CREATE INDEX IF NOT EXISTS idx_recurring_schedules_cancel_token ON recurring_schedules (cancel_token) WHERE cancel_token IS NOT NULL`

2. Modify `src/app/api/direct-booking/create-recurring/route.ts`:
   - Import `randomBytes` from `crypto` (already imported in bookings.ts — follow same pattern)
   - After computing the schedule data but before the insert, generate `const cancelToken = randomBytes(32).toString('hex')`
   - Add `cancel_token: cancelToken, cancel_token_created_at: new Date().toISOString()` to the recurring_schedules insert
   - After successful booking creation, compute `const manageUrl = \`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/manage/${cancelToken}\``
   - Pass `manageUrl` to the `sendRecurringBookingConfirmationEmail` call

3. Modify `src/emails/RecurringBookingConfirmationEmail.tsx`:
   - Add optional `manageUrl?: string` prop to the interface
   - After the payment note for parent (!isTeacher), add a section with a 'Manage your series' link pointing to manageUrl
   - Only render this section when manageUrl is provided and !isTeacher

4. Modify `src/lib/email.ts` in `sendRecurringBookingConfirmationEmail`:
   - Add optional `manageUrl?: string` to the params type
   - Pass `manageUrl` through to the parent variant of RecurringBookingConfirmationEmail

## Must-Haves

- [ ] Migration 0016 creates cancel_token + index on recurring_schedules
- [ ] create-recurring route generates and stores cancel_token
- [ ] Parent confirmation email includes manage URL link
- [ ] manageUrl only rendered in parent variant, not teacher variant

## Inputs

- ``supabase/migrations/0014_recurring_schedules.sql` — existing recurring_schedules schema to extend`
- ``src/app/api/direct-booking/create-recurring/route.ts` — existing route to add cancel_token generation`
- ``src/emails/RecurringBookingConfirmationEmail.tsx` — existing email template to add manageUrl prop`
- ``src/lib/email.ts` — existing email helper to pass manageUrl through`

## Expected Output

- ``supabase/migrations/0016_cancel_token.sql` — new migration adding cancel_token column + index`
- ``src/app/api/direct-booking/create-recurring/route.ts` — modified with cancel_token generation + manageUrl`
- ``src/emails/RecurringBookingConfirmationEmail.tsx` — modified with manageUrl prop + manage link section`
- ``src/lib/email.ts` — modified sendRecurringBookingConfirmationEmail with manageUrl param`

## Verification

npx tsc --noEmit && npm run build
