# M010: 

## Vision
Transform Tutelo's parent side from anonymous guest-booking into a full account experience — login-required dashboard with multi-child management, saved payment cards, real-time teacher-parent messaging — and give the platform operator a read-only admin dashboard with metrics and activity feed. Verify Google SSO end-to-end.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Parent Dashboard & Multi-Child | high | — | ✅ | Parent logs in, sees dashboard with My Children, adds a child, and books a session selecting that child from a dropdown instead of typing a name |
| S02 | Google SSO Verification | medium | — | ✅ | Teacher or parent clicks Continue with Google, completes OAuth flow, lands in the correct dashboard. Teacher can still verify school email post-Google-login |
| S03 | Saved Payment Methods | medium | S01 | ✅ | Parent books a session, card is auto-saved to their Stripe Customer. On next booking, parent sees Pay with saved card and completes checkout in one click |
| S04 | Teacher-Parent Messaging | high | S01 | ✅ | Teacher sends a message from their dashboard. Parent sees it appear in real-time on their dashboard. New message triggers email notification to recipient |
| S05 | Admin Dashboard | low | — | ✅ | Platform operator visits /admin, sees teacher count, total bookings, revenue, and recent activity feed. Non-admin users get 404 |
