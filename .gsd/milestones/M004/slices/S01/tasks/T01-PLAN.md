---
estimated_steps: 4
estimated_files: 2
---

# T01: Create time utilities and unit tests

**Slice:** S01 — Recurring Availability Editor with 5-Min Granularity
**Milestone:** M004

## Description

Create the pure-function utility module `src/lib/utils/time.ts` containing `generate5MinOptions()` and `validateNoOverlap()`, plus comprehensive Vitest unit tests. These utilities are consumed by the editor (T03) and reused by S02's override editor. Tests define correct behavior upfront and serve as the slice's contract verification.

## Steps

1. Create `src/lib/utils/time.ts` with:
   - `generate5MinOptions(): string[]` — returns 288 `HH:MM` strings from `"00:00"` to `"23:55"` in 5-minute increments. Use `Array.from({length: 288}, (_, i) => ...)` with zero-padded hours and minutes.
   - `formatTimeLabel(hhmm: string): string` — converts `"15:30"` to `"3:30 PM"` for display in dropdowns. Handles 12-hour formatting with AM/PM.
   - `validateNoOverlap(windows: {start_time: string, end_time: string}[]): {valid: boolean, error?: string}` — sorts a copy by `start_time`, rejects any window where `end_time <= start_time`, detects overlaps where `windows[i].end_time > windows[i+1].start_time`. Returns `{valid: true}` or `{valid: false, error: "descriptive message"}`.
2. Create `tests/unit/time-utils.test.ts` with test cases:
   - `generate5MinOptions` returns exactly 288 items
   - First item is `"00:00"`, last is `"23:55"`
   - Item at index 6 is `"00:30"`, item at index 12 is `"01:00"`
   - `formatTimeLabel` converts `"00:00"` → `"12:00 AM"`, `"12:00"` → `"12:00 PM"`, `"15:30"` → `"3:30 PM"`, `"08:05"` → `"8:05 AM"`
   - `validateNoOverlap` with empty array → valid
   - Single window → valid (if end > start)
   - Single window with end <= start → invalid
   - Two non-overlapping windows → valid
   - Two adjacent windows (e.g., `08:00–10:00` + `10:00–12:00`) → valid (touching is OK)
   - Two overlapping windows (e.g., `08:00–10:00` + `09:00–11:00`) → invalid
   - Multiple windows, one overlap among several → invalid
   - Unsorted input still correctly detected (function sorts internally)
3. Run tests to confirm all pass.
4. Verify the module exports are clean and TypeScript compiles.

## Must-Haves

- [ ] `generate5MinOptions()` returns exactly 288 `HH:MM` strings from `00:00` to `23:55`
- [ ] `formatTimeLabel()` correctly formats 24h `HH:MM` to 12h `h:MM AM/PM`
- [ ] `validateNoOverlap()` rejects overlapping ranges and `end_time <= start_time`
- [ ] `validateNoOverlap()` accepts empty arrays and adjacent (touching) ranges
- [ ] All unit tests pass

## Verification

- `npx vitest run tests/unit/time-utils.test.ts` — all tests pass
- `npx tsc --noEmit` — no type errors in new files

## Observability Impact

- Signals added/changed: None (pure functions, no runtime side effects)
- How a future agent inspects this: Run `npx vitest run tests/unit/time-utils.test.ts` to verify correctness
- Failure state exposed: `validateNoOverlap` returns `{valid: false, error: "descriptive message"}` — the error string identifies which windows overlap

## Inputs

- Vitest configured in `vitest.config.ts` with `@` path alias and jsdom environment
- Existing test pattern in `tests/unit/` (e.g., `tests/unit/og-metadata.test.ts`)

## Expected Output

- `src/lib/utils/time.ts` — `generate5MinOptions`, `formatTimeLabel`, `validateNoOverlap` exported
- `tests/unit/time-utils.test.ts` — comprehensive unit tests, all passing
