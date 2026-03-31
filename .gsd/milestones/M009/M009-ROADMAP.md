# M009: Recurring Sessions

## Vision
Parents can set up recurring tutoring schedules (weekly/biweekly for N weeks). The system creates individual booking rows per session, handles per-session payment via saved cards with auto-charging 24h before each session, and lets both teacher and parent cancel single sessions or the remaining series.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Schema & Recurring Booking Creation | high | — | ⬜ | Parent selects 'Every Tuesday at 4pm for 6 weeks' in booking flow. System creates 6 individual booking rows linked by recurring_schedule_id, skipping conflicting dates with a summary shown to the parent. |
| S02 | Saved Cards & Auto-Charge Cron | high | S01 | ⬜ | First session authorized at booking. Cron auto-charges the parent's saved card 24h before each subsequent session. Failed charges update booking status and notify both parties. |
| S03 | Cancellation & Dashboard Series UX | medium | S01, S02 | ⬜ | Teacher sees series badge on recurring sessions in dashboard and can cancel one or all remaining. Parent receives email with secure link to cancel individual sessions or the series. |
