# S02: Saved Cards & Auto-Charge Cron

**Goal:** Stripe Customer + SetupIntent for card saving during recurring booking. Extend stripe-reminders cron to charge upcoming recurring sessions. Payment failure handling with status updates and notifications.
**Demo:** After this: First session authorized at booking. Cron auto-charges the parent's saved card 24h before each subsequent session. Failed charges update booking status and notify both parties.

## Tasks
