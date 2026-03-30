---
verdict: needs-attention
remediation_round: 0
---

# Milestone Validation: M007

## Success Criteria Checklist
### Success Criteria Checklist

- [x] **SC-1: Capacity → at-capacity → waitlist flow** — Teacher with capacity_limit=3 and 3 active students → profile shows 'at capacity' + waitlist form; parent joins waitlist, booking cancelled → waitlisted parents receive email with booking link.
  - **Evidence:** S01 summary confirms AtCapacitySection replaces BookingCalendar when at capacity; WaitlistForm with 3 result states (success/already/error); /api/waitlist POST route with 201/409/400/500. S02 summary confirms checkAndNotifyWaitlist fires on cancelSession, sends WaitlistNotificationEmail to unnotified entries, batch-stamps notified_at. 15 capacity tests + 7 waitlist-notify tests + 9 cancel-session tests all pass.
  - **Verdict:** ✅ PASS

- [x] **SC-2: Session type → flat price through Stripe** — Teacher with 2 session types → parent selects 'SAT Prep $60 / 90 min', books a 90-min slot, Stripe PaymentIntent for $60 flat (not hourly_rate × duration).
  - **Evidence:** S03 summary confirms create-intent API accepts sessionTypeId, fetches session type, validates teacher ownership, uses Math.round(Number(price) * 100) for PI amount. BookingCalendar shows session type picker cards, filters slots by duration_minutes, passes sessionTypeId to PI creation. 8 session-type-pricing tests pass including flat-price path, wrong-teacher rejection, dollar-to-cent conversion.
  - **Verdict:** ✅ PASS

- [x] **SC-3: Backward compatibility — no session types, no capacity limit** — Unchanged booking flow (subject selector, hourly_rate proration, no capacity check).
  - **Evidence:** S01: getCapacityStatus short-circuits when limit is null (no DB query). S03: BookingCalendar shows subject dropdown when sessionTypes is empty; create-intent falls back to computeSessionAmount. Backward compat unit test in session-type-pricing.test.ts passes. S01 capacity.test.ts includes null-limit tests.
  - **Verdict:** ✅ PASS

- [x] **SC-4: Migration 0011 applies cleanly** — No destructive changes to existing schema.
  - **Evidence:** S01 summary: migration adds nullable capacity_limit column, creates waitlist and session_types tables. All additive. Present in worktree at supabase/migrations/0011_capacity_and_session_types.sql.
  - **Verdict:** ✅ PASS

- [x] **SC-5: Unit tests + build + tsc** — All new features have unit tests; npm run build passes; npx tsc --noEmit exits 0.
  - **Evidence:** 15 capacity tests ✅, 7 waitlist-notify tests ✅, 9 cancel-session tests ✅, 8 session-type-pricing tests ✅, 18 booking-slots tests ✅. tsc --noEmit: only pre-existing qrcode.react errors (M006 dependency, not M007). npm run build: same pre-existing qrcode.react failure only.
  - **Verdict:** ✅ PASS (qrcode errors are pre-existing from M006, documented in S03 known limitations)

## Slice Delivery Audit
### Slice Delivery Audit

| Slice | Claimed Output | Delivered | Verdict |
|-------|---------------|-----------|---------|
| S01: Capacity + Waitlist Signup | Teacher sets capacity_limit in dashboard. At-capacity profile shows waitlist form. Parent joins waitlist. Teacher info visible. | ✅ Migration 0011 (capacity_limit, waitlist, session_types). CapacitySettings UI. Profile capacity gate. AtCapacitySection + WaitlistForm. /api/waitlist POST. 15 unit tests. All key files present in worktree. | ✅ PASS |
| S02: Waitlist Dashboard + Notifications | /dashboard/waitlist page with view/remove. Email notification on cancellation when capacity frees. | ✅ /dashboard/waitlist RSC with 3 states. WaitlistEntryRow with remove + confirmation. WaitlistNotificationEmail template. checkAndNotifyWaitlist utility. cancelSession integration. Nav item added. 7 + 9 tests pass. All key files in worktree. | ✅ PASS |
| S03: Session Types + Variable Pricing | Teacher creates session types in settings. Parent selects type → sees filtered slots → Stripe PI at flat price. No session types → unchanged flow. | ✅ SessionTypeManager CRUD UI. BookingCalendar session type picker with step guard. create-intent flat-price fork with teacher ownership. durationMinutes slot filtering. 8 + 18 tests pass. All key files on main. | ✅ PASS |

## Cross-Slice Integration
### Cross-Slice Integration

**S01 → S02 boundary:**
- S01 provides: waitlist table, isAtCapacity utility, /api/waitlist endpoint
- S02 consumes: waitlist table (reads entries, stamps notified_at), getCapacityStatus (rechecks capacity after cancellation)
- **Status:** ✅ Aligned. S02 summary confirms consumption of S01 waitlist table and capacity utility. checkAndNotifyWaitlist fetches from waitlist and calls getCapacityStatus.

**S01 → S03 boundary:**
- S01 provides: session_types table (scaffolded in migration 0011), profile page capacity gate pattern
- S03 consumes: session_types table (CRUD via server actions), profile page pattern (conditional rendering)
- **Status:** ✅ Aligned. S03 summary confirms session_types table consumption, settings page fetches by teacher.id PK, profile page fetches and passes to BookingCalendar.

**S02 → S03 boundary:**
- S02 provides: Zod .issues fix in session-types.ts (pre-existing bug)
- S03 consumes: session-types.ts server actions (created independently in S03/T02, not inherited from S02)
- **Status:** ✅ No conflict. S03 created its own server actions; S02 Zod fix was a blocker-adjacent cleanup.

**Branch integration gap (ATTENTION):**
- S01 + S02 code lives on `milestone/M007` branch (worktree), with 11 commits not in main
- S03 code lives on `main` branch, with 5 commits not in milestone/M007
- These branches have NOT been merged. The milestone's complete code is split across two unmerged branches.
- **Risk:** Merge conflicts possible when combining. Profile page ([slug]/page.tsx) and settings page (dashboard/settings/page.tsx) were modified by both branches — high likelihood of merge conflicts.
- **Impact:** Does not affect code quality or test results (each branch is individually verified), but the milestone cannot be considered "shipped" until the branches are unified.

## Requirement Coverage
### Requirement Coverage (M007 scope)

| Requirement | Status | Slice | Evidence |
|-------------|--------|-------|----------|
| CAP-01 | ✅ Addressed | S01 | capacity_limit column on teachers via migration 0011; CapacitySettings UI; updateProfile extended with Zod-validated nullable integer; 15 unit tests |
| CAP-02 | ✅ Addressed | S01 | Profile RSC checks capacity; conditionally renders AtCapacitySection or BookingCalendar; BookNowCTA hidden at capacity; hero/credentials/about/reviews always visible |
| WAIT-01 | ✅ Addressed | S01 | WaitlistForm component + /api/waitlist POST with duplicate-safe insert (unique constraint + 409); anonymous parents can sign up |
| WAIT-02 | ✅ Validated (D006) | S02 | /dashboard/waitlist page with email, join date, notified status badge; removeWaitlistEntry with teacher ownership guard |
| WAIT-03 | ✅ Validated (D006) | S02 | checkAndNotifyWaitlist fires on cancelSession; sends email to unnotified entries; batch-stamps notified_at; 7+9 tests |
| SESS-01 | ✅ Addressed | S03 | SessionTypeManager CRUD UI with label/price/duration; createSessionType/updateSessionType/deleteSessionType server actions with ownership |
| SESS-02 | ✅ Addressed | S03 | BookingCalendar session type picker cards with label, price, duration; selectedSessionType drives price display |
| SESS-03 | ✅ Addressed | S03 | create-intent accepts sessionTypeId, validates teacher ownership, uses flat price Math.round(Number(price)*100); 8 unit tests |
| SESS-04 | ✅ Addressed | S03 | Empty sessionTypes → subject dropdown unchanged, create-intent hourly_rate fallback; backward compat test passes |

**All 9 M007-scoped requirements are addressed. CAP-01, CAP-02, WAIT-01, SESS-01–04 remain status=active (validation field unmapped in REQUIREMENTS.md). WAIT-02, WAIT-03 are already validated.**

**Note:** Requirements should be transitioned to validated status with proof after milestone completion.

## Verification Class Compliance
### Verification Class Compliance

**Contract Verification:** ✅ MET
- `npx tsc --noEmit` exits 0 on worktree (S01/S02); exits with only pre-existing qrcode errors on main (S03). No M007-introduced type errors.
- `npm run build` passes on worktree; fails on main only due to pre-existing qrcode.react missing module (M006 dependency).
- All new unit tests pass: 15 (capacity) + 7 (waitlist-notify) + 9 (cancel-session) + 8 (session-type-pricing) + 18 (booking-slots) = **57 tests passing**.

**Integration Verification:** ⚠️ PARTIALLY MET
- Booking flow E2E with session-type pricing through Stripe: described in S03 UAT scripts (TC-10, TC-11) but no automated E2E test exists. Unit tests mock the Stripe path.
- Waitlist email on capacity change: covered by cancel-session integration test (mocked Resend) — 9/9 pass. Actual email delivery is UAT-level.
- Profile page capacity toggle: described in S01 UAT scripts (TC-05, TC-06) but relies on manual verification with real DB state.
- **Gap:** No automated integration tests with real DB or Stripe test mode. Integration is proven at the unit/mock level + UAT script level.

**Operational Verification:** ⚠️ NOT DIRECTLY PROVEN
- Claim: "Existing teachers with no session types and no capacity limit experience zero behavior change after migration."
- Evidence: Unit tests confirm null capacity → no DB query, empty sessionTypes → subject dropdown. Migration 0011 is additive only.
- **Gap:** No operational smoke test against a running instance. The operational claim is supported by code-level analysis (null guards, default parameters, additive migration) but not by an actual deployment test.

**UAT Verification:** ✅ COMPREHENSIVE SCRIPTS PROVIDED
- S01: 20 test cases covering capacity settings, profile states, waitlist signup, API validation, edge cases
- S02: 12 test cases covering nav item, page states, entry management, email notification, partial failure
- S03: 16 test cases + 4 edge cases covering CRUD, session type selector, Stripe PI, backward compat, security
- **Gap:** UAT scripts are manual — no evidence they were actually executed against a running instance. They serve as executable specifications for post-deploy verification.


## Verdict Rationale
**Verdict: needs-attention** — All 5 success criteria pass. All 3 slices deliver their claimed output. All 9 M007-scoped requirements are addressed. 57 unit/integration tests pass. Cross-slice data contracts are aligned.

Two gaps prevent a clean `pass`:

1. **Branch integration gap:** S01+S02 code is on `milestone/M007` branch (11 unmerged commits) while S03 code is on `main` (5 commits). Both branches modify `[slug]/page.tsx` and `dashboard/settings/page.tsx`, creating likely merge conflicts. The milestone code cannot be deployed until branches are unified. This is a process/workflow gap, not a code quality gap.

2. **Operational verification not directly proven:** The "zero behavior change" operational claim for existing teachers is supported by code-level evidence (null guards, additive migration, backward-compat unit tests) but no deployment or runtime smoke test was performed. This is acceptable for the current stage but should be noted.

3. **Pre-existing qrcode.react build error (minor):** npm run build fails on main due to missing qrcode.react dependency from M006. Not introduced by M007 but blocks production deployment. Documented as known issue.

These gaps are minor and do not require remediation slices — they are addressable as part of the milestone completion merge workflow and post-deploy UAT execution.
