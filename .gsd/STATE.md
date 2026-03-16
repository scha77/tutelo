# GSD State

**Active Milestone:** None
**Active Slice:** None
**Phase:** idle
**Requirements Status:** 0 active · 81 validated · 4 deferred · 0 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- ✅ **M002:** Production Launch
- ✅ **M003:** Landing Page & Polish
- ✅ **M004:** Availability & Scheduling Overhaul
- ⬜ **M005:** Trust & Communication

## Recent Decisions
- Separate availability_overrides table (not nullable column) for per-date overrides
- Override-wins-recurring precedence: if any override row exists for a date, recurring is fully ignored
- 30-min booking slot increments within availability windows
- computeSessionAmount for duration-prorated payments
- cancelSession calls sendCancellationEmail (both parties) — teacher copy cosmetic fix deferred

## Blockers
- None

## Next Action
M004 complete. Next milestone is M005 (Trust & Communication).
