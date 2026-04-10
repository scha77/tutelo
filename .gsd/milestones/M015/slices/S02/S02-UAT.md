# S02: Cron Job Verification & Monitoring — UAT

**Milestone:** M015
**Written:** 2026-04-10T04:38:45.192Z

## UAT: Cron Job Verification & Monitoring

### Preconditions
- Access to the Vercel project dashboard
- Access to the Sentry project with Crons feature enabled
- `CRON_SECRET` env var available
- All 4 cron routes deployed

---

### Test 1: Verify withMonitor wrapping in source code
**Steps:**
1. Run `grep -A2 'withMonitor' src/app/api/cron/auto-cancel/route.ts`
2. Confirm the line reads `Sentry.withMonitor('cron-auto-cancel', async () => {`
3. Confirm the auth check (`authHeader !== Bearer...`) appears BEFORE the withMonitor call
4. Repeat for stripe-reminders (slug: `cron-stripe-reminders`), recurring-charges (slug: `cron-recurring-charges`), session-reminders (slug: `cron-session-reminders`)

**Expected:** Each route has exactly 1 withMonitor call with a unique slug. Auth check is outside the wrapper in all 4 routes.

---

### Test 2: Verify stale comments are fixed
**Steps:**
1. `head -1 src/app/api/cron/auto-cancel/route.ts` → should say "Daily cron — auto-cancels requested bookings older than 48h where teacher hasn't connected Stripe"
2. `head -1 src/app/api/cron/stripe-reminders/route.ts` → should say "Daily cron — sends Stripe setup reminders to teachers with pending bookings"
3. `head -1 src/app/api/cron/session-reminders/route.ts` → should say "Daily cron — sends session reminder emails and SMS to parents with upcoming bookings"
4. Verify no route mentions "hourly", "Vercel Pro", or "(0 * * * *)"

**Expected:** All 3 comments are accurate. No stale references remain.

---

### Test 3: Cron tests pass with updated mocks
**Steps:**
1. Run `npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts src/__tests__/recurring-charges.test.ts src/__tests__/reminders.test.ts`
2. Confirm 23 tests pass (auto-cancel: 5, reminders-cron: 5, recurring-charges: 8, reminders: 5)

**Expected:** All 23 tests pass. No test references missing `withMonitor` mock.

---

### Test 4: Monitor config matches vercel.json schedules
**Steps:**
1. Run `cat vercel.json | grep -A2 cron`
2. For each route, confirm the `schedule.value` in the `monitorConfig` matches the vercel.json crontab:
   - auto-cancel: `0 9 * * *`
   - stripe-reminders: `0 10 * * *`
   - recurring-charges: `0 12 * * *`
   - session-reminders: `0 14 * * *`

**Expected:** All 4 schedules match between vercel.json and route monitorConfig.

---

### Test 5: Runbook completeness
**Steps:**
1. Open `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md`
2. Confirm it contains:
   - Schedule reference table with all 4 routes
   - Manual trigger curl commands with Bearer token auth
   - Expected 200 response shapes for each route
   - Sentry Crons dashboard verification steps
   - Troubleshooting section for common failures

**Expected:** All sections present with accurate, actionable content.

---

### Test 6: Production heartbeat (post-deploy)
**Steps:**
1. Deploy code to Vercel
2. Manually trigger each cron: `curl -s -H "Authorization: Bearer $CRON_SECRET" https://tutelo.app/api/cron/auto-cancel`
3. Confirm 200 response with expected JSON shape
4. Check Sentry → Crons dashboard → verify `cron-auto-cancel` shows a check-in
5. Repeat for remaining 3 routes
6. Wait 24 hours and verify Sentry shows scheduled check-ins arriving on time

**Expected:** All 4 routes respond 200 on manual trigger. Sentry Crons dashboard shows check-ins. After 24h, heartbeats arrive at the scheduled times.
