# S05: End-to-End Booking Flow Test — UAT

**Milestone:** M015
**Written:** 2026-04-10T06:50:44.528Z

## UAT: End-to-End Booking Flow Test

### Preconditions
- Dev server running on port 3000 (`npm run dev`)
- `.env.local` has: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_SECRET_KEY`, `RESEND_API_KEY`
- `E2E_STRIPE_CONNECTED_ACCOUNT_ID` env var set to a real Stripe test-mode connected account with `charges_enabled=true`
- Chromium installed (`npx playwright install chromium`)

### Test 1: Playwright discovers all tests
1. Run `npx playwright test --list`
2. **Expected:** Output shows 11 tests in `booking-e2e.spec.ts` across "Booking Flow" and "Teacher Cancellation" describe blocks

### Test 2: Full E2E suite passes
1. Run `E2E_STRIPE_CONNECTED_ACCOUNT_ID=<account_id> npx playwright test booking-e2e --reporter=list`
2. **Expected:** 10 passed, 1 skipped (Stripe card fill), 0 failed
3. **Expected skipped test:** "complete Stripe test card payment" — skipped with message about iframe structure

### Test 3: Teacher profile and calendar interaction
1. In the test run, observe "navigate to teacher profile and select a time slot" test
2. **Expected:** Navigates to `/e2e-test-teacher`, finds available dates in calendar grid, clicks a date, selects a time slot, form step appears with "Student's name" label

### Test 4: Booking form submission
1. Observe "fill booking form and submit" test
2. **Expected:** Fills student name ("E2E Test Student"), selects Math subject from Radix dropdown, fills email and notes, clicks "Continue to Payment", recurring options step appears

### Test 5: Auth flow
1. Observe "choose one-time booking and proceed to auth" and "sign in as parent and proceed to payment" tests
2. **Expected:** Selects one-time booking, signs in with pre-created parent credentials, payment step renders with "Complete your booking" heading

### Test 6: DB booking verification
1. Observe "booking exists in database with correct data" test
2. **Expected:** Booking row exists with student_name="E2E Test Student", correct teacher_id, status="requested"

### Test 7: Webhook simulation and email
1. Observe "simulate webhook and verify confirmation email" test
2. **Expected:** Booking status updated to "confirmed" in DB. Email check is soft-asserted (warns if not found, doesn't fail)

### Test 8: Teacher cancellation
1. Observe "sign in as teacher and navigate to sessions" test
2. **Expected:** Teacher logs in, navigates to /dashboard/sessions, sessions page loads with h1 "Sessions"

### Test 9: Cancel booking
1. Observe "find and cancel the E2E booking" test
2. **Expected:** Finds card with "E2E Test Student", clicks "Cancel Session", auto-accepts window.confirm, card disappears or toast shows "Session cancelled"

### Test 10: Cancellation DB verification
1. Observe "booking status is cancelled in database" test
2. **Expected:** Booking status is "cancelled" in DB

### Test 11: Data cleanup
1. After all tests complete, verify no residual test data
2. **Expected:** Test teacher, parent auth user, bookings, and availability cleaned up in afterAll

### Edge Cases
- **Stale cache:** Sessions page may not show the booking immediately due to `unstable_cache` (30s TTL). Test handles this with reload-and-retry pattern.
- **Stripe iframe:** If Stripe changes their iframe nesting, the card fill test gracefully skips rather than failing the suite.
- **Resend API unavailable:** Email verification tests warn but don't fail — the booking/cancellation flow itself is verified via DB assertions.
