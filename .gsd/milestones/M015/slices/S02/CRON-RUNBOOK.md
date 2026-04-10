# Cron Job Verification Runbook

How to verify cron health in production for Tutelo's 4 scheduled jobs.

---

## Cron Schedule Reference

| Route | Schedule (UTC) | Sentry Monitor Slug | Purpose |
|---|---|---|---|
| `/api/cron/auto-cancel` | `0 9 * * *` (9 AM) | `cron-auto-cancel` | Cancel requested bookings >48h old where teacher hasn't connected Stripe |
| `/api/cron/stripe-reminders` | `0 10 * * *` (10 AM) | `cron-stripe-reminders` | Send Stripe setup reminders to teachers with pending bookings |
| `/api/cron/recurring-charges` | `0 12 * * *` (12 PM) | `cron-recurring-charges` | Auto-charge saved cards 24h before recurring sessions |
| `/api/cron/session-reminders` | `0 14 * * *` (2 PM) | `cron-session-reminders` | Send reminder emails/SMS to parents with upcoming sessions |

---

## 1. Manual Trigger via curl

Each cron route requires a `Bearer` token matching the `CRON_SECRET` environment variable.

```bash
# Set your secret (from Vercel env vars or .env.local)
export CRON_SECRET="your-cron-secret-here"
export BASE_URL="https://tutelo.app"  # or http://localhost:3000

# Auto-cancel
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/auto-cancel" | jq .

# Stripe reminders
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/stripe-reminders" | jq .

# Recurring charges
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/recurring-charges" | jq .

# Session reminders
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/session-reminders" | jq .
```

### Expected 200 Response Shapes

**auto-cancel:**
```json
{ "cancelled": 0, "total_checked": 0 }
```

**stripe-reminders:**
```json
{ "sent_24hr": 0, "sent_48hr": 0 }
```

**recurring-charges:**
```json
{ "charged": 0, "failed": 0, "skipped": 0, "checked": 0 }
```

**session-reminders:**
```json
{ "sent": 0, "checked": 0 }
```

All counts will be 0 if there's no actionable data — that's a healthy no-op.

---

## 2. Verifying Sentry Crons Dashboard

1. Open **Sentry → Crons** (https://sentry.io/crons/)
2. Look for 4 monitors:
   - `cron-auto-cancel`
   - `cron-stripe-reminders`
   - `cron-recurring-charges`
   - `cron-session-reminders`
3. Each monitor should show:
   - **Status:** OK (green) after a successful run
   - **Schedule:** Matching the crontab values above
   - **Last check-in:** Within the expected schedule window
4. If a monitor shows **Missed** or **Error**:
   - **Missed:** The cron didn't fire at all — check Vercel Crons logs
   - **Error:** The handler threw an exception — check Sentry Issues for the error
   - **Timed out:** The handler exceeded `maxRuntime` (5 min) — check for slow DB queries

### Monitor Configuration

Each monitor is configured with:
- `checkinMargin: 5` — allows 5 minutes of schedule drift before marking as missed
- `maxRuntime: 5` — marks as timed out if the handler runs longer than 5 minutes
- `failureIssueThreshold: 2` — creates a Sentry issue after 2 consecutive failures
- `recoveryThreshold: 1` — resolves the issue after 1 successful run

---

## 3. Verifying vercel.json Schedules

The source of truth for Vercel Cron schedules is `vercel.json`:

```bash
cat vercel.json | jq '.crons'
```

Cross-check each entry:
- `path` must match an existing API route under `src/app/api/cron/`
- `schedule` must match the Sentry monitor config's `value` field in that route
- All schedules are in UTC

If adding a new cron, update both `vercel.json` **and** the route's `withMonitor` config.

---

## 4. Troubleshooting

### Cron returns 401
- `CRON_SECRET` env var is not set or doesn't match
- Check Vercel Environment Variables → Production

### Cron returns 500
- `CRON_SECRET` is not configured (check `console.error` in Vercel logs)
- Database query failed (check Sentry for the exception)

### Sentry shows "Missed" but Vercel logs show the cron ran
- The `withMonitor` slug in the route doesn't match what Sentry expects
- Check that the monitor was auto-created (first successful run creates it)

### Emails not sending despite successful cron run
- Check Resend dashboard for delivery status
- Verify `RESEND_API_KEY` is set in production
- Email errors are caught and logged but don't fail the cron (by design)
