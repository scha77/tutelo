---
id: T02
parent: S04
milestone: M008
provides: []
requires: []
affects: []
key_files: ["src/lib/utils/bot-filter.ts", "tests/unit/bot-filter.test.ts"]
key_decisions: ["isBot returns true for null/empty UA — conservative choice, no UA = likely automated", "20-entry BOT_PATTERNS list covers the most common crawlers + automated tools"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx vitest run tests/unit/bot-filter.test.ts \u2014 8 tests pass."
completed_at: 2026-03-31T02:33:58.145Z
blocker_discovered: false
---

# T02: Bot filter utility with 8 passing tests.

> Bot filter utility with 8 passing tests.

## What Happened
---
id: T02
parent: S04
milestone: M008
key_files:
  - src/lib/utils/bot-filter.ts
  - tests/unit/bot-filter.test.ts
key_decisions:
  - isBot returns true for null/empty UA — conservative choice, no UA = likely automated
  - 20-entry BOT_PATTERNS list covers the most common crawlers + automated tools
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:33:58.145Z
blocker_discovered: false
---

# T02: Bot filter utility with 8 passing tests.

**Bot filter utility with 8 passing tests.**

## What Happened

Created isBot() with 20 bot UA patterns (all major crawlers + curl + python-requests). Returns true for null/empty. 8 Vitest tests cover null, empty, Googlebot, Bingbot, python-requests, curl, iPhone Safari (real), Chrome Windows (real). All pass.

## Verification

npx vitest run tests/unit/bot-filter.test.ts \u2014 8 tests pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/bot-filter.test.ts` | 0 | ✅ pass — 8/8 tests | 8100ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/utils/bot-filter.ts`
- `tests/unit/bot-filter.test.ts`


## Deviations
None.

## Known Issues
None.
