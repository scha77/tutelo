# Deferred Items — 02-booking-requests

## Pre-existing Test Failures (Out of Scope for 02-02)

**tests/bookings/email.test.ts — 3 failing tests**

These tests were created in Plan 02-03 TDD RED phase (commit c913477) and are
intentionally failing until the GREEN phase of Plan 02-03 fixes the Resend mock:

- `sendBookingEmail > sends MoneyWaitingEmail when stripe_charges_enabled is false`
- `sendBookingEmail > sends BookingNotificationEmail when stripe_charges_enabled is true`
- `sendBookingEmail > does NOT send email when social_email is null`

Root cause: Resend mock in the test uses a factory function `() => ({...})` but
`new Resend()` requires a class mock (needs `vi.fn().mockImplementation(() => ({...}))` or
`vi.spyOn`). Fix belongs in Plan 02-03 GREEN phase.

Status: Will be addressed in Plan 02-03 when the email module implementation is completed.
