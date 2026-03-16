# GSD State

**Active Milestone:** M005 — Trust & Communication
**Active Slice:** None
**Phase:** planned
**Requirements Status:** 0 active · 81 validated · 4 deferred · 0 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- ✅ **M002:** Production Launch
- ✅ **M003:** Landing Page & Polish
- ✅ **M004:** Availability & Scheduling Overhaul
- 🔄 **M005:** Trust & Communication (3 slices planned)

## Recent Decisions
- SMS track before verification track — higher confidence, higher impact
- School email domain check for verification (not manual, not third-party API)
- Twilio for SMS; libphonenumber-js for phone validation
- Single migration 0008 for all schema changes
- Custom verification token (not Supabase magic link) for school email
- CredentialsBar badge gated on verified_at (fixing hardcoded trust liability)

## Blockers
- None

## Next Action
Execute S01: SMS Infrastructure & Teacher Phone Collection
