---
estimated_steps: 36
estimated_files: 4
skills_used: []
---

# T03: Convert auto-cancel and stripe-reminders cron stubs to real tests

Convert 10 it.todo() stubs across 2 cron route test files into real passing tests.

### auto-cancel (5 tests) — `tests/stripe/auto-cancel.test.ts`

**Production code** (`src/app/api/cron/auto-cancel/route.ts`):
- Auth: checks `Authorization: Bearer {CRON_SECRET}` header → 401 if missing/wrong
- Queries bookings: `supabaseAdmin.from('bookings').select('id, parent_email, teacher_id').eq('status', 'requested').lt('created_at', cutoff48hr)`
- Per booking: checks teacher's `stripe_charges_enabled` via `supabaseAdmin.from('teachers').select(...).eq('id', teacher_id).maybeSingle()`
- If teacher NOT connected: updates booking status to 'cancelled' with `.eq('status', 'requested')` idempotency guard
- Sends `sendCancellationEmail(booking.id)` only if update returned rows
- Returns JSON `{ cancelled, total_checked }`

**5 tests:**
1. Returns 401 when Authorization header missing or wrong
2. Cancels requested bookings >48hr old where teacher stripe_charges_enabled=false
3. Does NOT cancel when teacher has stripe_charges_enabled=true
4. Is idempotent — second run cancels 0 rows
5. Sends cancellation email AFTER status update, not before

### stripe-reminders (5 tests) — `tests/stripe/reminders-cron.test.ts`

**Production code** (`src/app/api/cron/stripe-reminders/route.ts`):
- Auth: same CRON_SECRET header check → 401
- Queries: `supabaseAdmin.from('bookings').select('..., teachers(...)').eq('status', 'requested').lt('created_at', hr24)`
- Per booking: skips if `teacher.stripe_charges_enabled=true` or no `social_email`
- If booking 48hr+ old: calls `sendUrgentFollowUpEmail(teacher.social_email, ...)`
- If booking 24-48hr old: calls `sendFollowUpEmail(teacher.social_email, ...)`
- Returns JSON `{ sent_24hr, sent_48hr }`

**5 tests:**
1. Returns 401 when Authorization header missing or wrong
2. Sends 24hr gentle reminder for 24-48hr old booking
3. Sends 48hr urgent email for >48hr old booking
4. Sends no email for <24hr old booking (filtered by .lt query)
5. Sends no reminder when teacher has stripe_charges_enabled=true

**Both files share the same mock pattern:**
- `supabaseAdmin` from `@/lib/supabase/service` — mock `from()` chains
- Email functions from `@/lib/email` — already mocked in scaffold
- `@sentry/nextjs` — already mocked in scaffold
- `process.env.CRON_SECRET` — set in test

**Import pattern for route handlers:** `const { GET } = await import('@/app/api/cron/auto-cancel/route')`
**Request construction:** `new NextRequest('http://localhost/api/cron/auto-cancel', { headers: { authorization: 'Bearer test-secret' } })`

## Inputs

- ``tests/stripe/auto-cancel.test.ts` — existing stub file with mock scaffolding`
- ``tests/stripe/reminders-cron.test.ts` — existing stub file with mock scaffolding`
- ``src/app/api/cron/auto-cancel/route.ts` — production route handler`
- ``src/app/api/cron/stripe-reminders/route.ts` — production route handler`

## Expected Output

- ``tests/stripe/auto-cancel.test.ts` — 5 real passing tests, 0 stubs`
- ``tests/stripe/reminders-cron.test.ts` — 5 real passing tests, 0 stubs`

## Verification

npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts — expect 10 passed, 0 todo, 0 skip.
