---
id: T01
parent: S03
milestone: M009
provides: []
requires: []
affects: []
key_files: ["supabase/migrations/0016_cancel_token.sql", "src/app/api/direct-booking/create-recurring/route.ts", "src/emails/RecurringBookingConfirmationEmail.tsx", "src/lib/email.ts"]
key_decisions: ["cancel_token uses randomBytes(32).toString('hex') for 64-char hex tokens — same crypto pattern used elsewhere in the codebase"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit passed with zero errors. npm run build passed with all routes compiling successfully."
completed_at: 2026-03-31T14:38:59.105Z
blocker_discovered: false
---

# T01: Added cancel_token column to recurring_schedules, generated token at booking creation, and included manage URL in parent confirmation email

> Added cancel_token column to recurring_schedules, generated token at booking creation, and included manage URL in parent confirmation email

## What Happened
---
id: T01
parent: S03
milestone: M009
key_files:
  - supabase/migrations/0016_cancel_token.sql
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/emails/RecurringBookingConfirmationEmail.tsx
  - src/lib/email.ts
key_decisions:
  - cancel_token uses randomBytes(32).toString('hex') for 64-char hex tokens — same crypto pattern used elsewhere in the codebase
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:38:59.105Z
blocker_discovered: false
---

# T01: Added cancel_token column to recurring_schedules, generated token at booking creation, and included manage URL in parent confirmation email

**Added cancel_token column to recurring_schedules, generated token at booking creation, and included manage URL in parent confirmation email**

## What Happened

Created migration 0016_cancel_token.sql adding cancel_token TEXT UNIQUE and cancel_token_created_at TIMESTAMPTZ columns to recurring_schedules with a partial index. Modified create-recurring route to generate a 64-char hex token via randomBytes(32), store it on schedule insert, compute manageUrl, and pass it to the email helper. Updated email.ts to accept and forward manageUrl to the parent variant only. Added a conditional "Manage your series" link section to RecurringBookingConfirmationEmail.tsx that renders only for parents (!isTeacher && manageUrl).

## Verification

npx tsc --noEmit passed with zero errors. npm run build passed with all routes compiling successfully.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 12600ms |
| 2 | `npm run build` | 0 | ✅ pass | 17300ms |


## Deviations

Renumbered inline step comments in create-recurring/route.ts to accommodate the new step 6 for cancel token generation. No functional deviation.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0016_cancel_token.sql`
- `src/app/api/direct-booking/create-recurring/route.ts`
- `src/emails/RecurringBookingConfirmationEmail.tsx`
- `src/lib/email.ts`


## Deviations
Renumbered inline step comments in create-recurring/route.ts to accommodate the new step 6 for cancel token generation. No functional deviation.

## Known Issues
None.
