# GSD State

**Active Milestone:** M004 — Availability & Scheduling Overhaul
**Active Slice:** None
**Phase:** planned
**Requirements Status:** 0 active · 76 validated · 9 deferred · 0 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- ✅ **M002:** Production Launch
- ✅ **M003:** Landing Page & Polish
- 🔄 **M004:** Availability & Scheduling Overhaul (planned — 4 slices)
- ⬜ **M005:** Trust & Communication

## M004 Slices
- ⬜ **S01:** Recurring Availability Editor with 5-Min Granularity `risk:high`
- ⬜ **S02:** Per-Date Override Availability `risk:medium` `depends:[S01]`
- ⬜ **S03:** Booking Calendar Integration `risk:medium` `depends:[S01,S02]`
- ⬜ **S04:** Last-Minute Session Cancellation `risk:low` (independent)

## Recent Decisions
- Separate `availability_overrides` table (not nullable column)
- Time-range picker paradigm replaces 1-hour toggle grid
- Override-wins-recurring precedence (override rows for a date replace all recurring)
- 30-min booking increments within availability windows for parent calendar
- S04 independent of S01–S03 (parallelizable)

## Blockers
- None

## Next Action
Execute S01 (or S04 in parallel).
