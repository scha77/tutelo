# S04: Wire Rate Limits to Public Endpoints

**Goal:** Apply the S03 primitive to every unauthenticated public endpoint. Pick limits conservative enough to not bother real users, aggressive enough to stop abuse.
**Demo:** After this: After this: Burst traffic against /api/waitlist, /api/track-view, /api/verify-email, and the login action returns 429 after hitting the limit. Legitimate requests still work.

## Tasks
