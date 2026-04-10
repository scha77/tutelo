# S05: End-to-End Booking Flow Test

**Goal:** Lock down the critical booking flow behind a repeatable end-to-end test so future changes can't silently break the launch-critical path.
**Demo:** After this: After this: `npx playwright test booking-e2e` signs up a test parent, navigates to a seeded test teacher profile, books a session, completes Stripe test card payment, verifies the booking email arrived in a test inbox, cancels the booking, and verifies the cancellation email arrived. All green.

## Tasks
