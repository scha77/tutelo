---
estimated_steps: 12
estimated_files: 5
skills_used: []
---

# T01: Polish shared dashboard components (StatsBar, RequestCard, ConfirmedSessionCard, ReviewPreviewCard, WaitlistEntryRow)

Upgrade the 5 shared dashboard components used across multiple teacher pages to the premium card standard established in S01/S02. This task must be done first because teacher dashboard pages (T02) render these components — polishing them here means T02 inherits the improvements automatically.

**Key patterns to apply:**
- Card elevation: `rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow` (from S01 ReviewsSection)
- Tinted icon pill (dashboard context): `style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}` with `rounded-lg p-2` container — NOT `var(--accent)` which is near-white in dashboard
- SVG stars: Replace Unicode ★/☆ text with inline SVG `<svg viewBox='0 0 20 20'>` star paths (matching S01 ReviewsSection pattern)
- Subject/status chips: `rounded-full px-2 py-0.5 text-xs font-medium` with `color-mix(in srgb, var(--primary) 12%, transparent)` background

**Important constraints:**
- Do NOT change any props, state, event handlers, or functional logic — CSS/layout only
- Keep staggerContainer/staggerItem animation in StatsBar unchanged
- Preserve all existing `AnimatedButton` usage in RequestCard and ConfirmedSessionCard
- WaitlistEntryRow: keep the `window.confirm` and toast patterns
- RequestCard: keep the `formatInTimeZone` and `formatDistanceToNow` logic unchanged

## Inputs

- ``src/components/dashboard/StatsBar.tsx` — current: `rounded-lg bg-muted/30 p-4 shadow-sm` stat items, icons inline without tinted pill`
- ``src/components/dashboard/RequestCard.tsx` — current: `rounded-lg border bg-card p-4 shadow-sm`, plain text subject`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — current: `rounded-lg border bg-card p-4 shadow-sm`, raw color status badges`
- ``src/components/dashboard/ReviewPreviewCard.tsx` — current: `rounded-lg border bg-card p-4 shadow-sm`, Unicode star characters`
- ``src/components/dashboard/WaitlistEntryRow.tsx` — current: `rounded-lg border bg-card px-4 py-3``

## Expected Output

- ``src/components/dashboard/StatsBar.tsx` — upgraded to `rounded-xl bg-card border shadow-sm` with icon in tinted pill container`
- ``src/components/dashboard/RequestCard.tsx` — upgraded to `rounded-xl` with subject chip using color-mix tinted background`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — upgraded to `rounded-xl` with status chip styling unified`
- ``src/components/dashboard/ReviewPreviewCard.tsx` — upgraded to `rounded-xl` with SVG star icons replacing Unicode`
- ``src/components/dashboard/WaitlistEntryRow.tsx` — upgraded to `rounded-xl` with improved status badge`

## Verification

npx tsc --noEmit && npx vitest run
