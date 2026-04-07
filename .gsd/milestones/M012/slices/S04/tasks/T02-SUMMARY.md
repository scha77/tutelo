---
id: T02
parent: S04
milestone: M012
key_files:
  - src/components/dashboard/RequestCard.tsx
  - src/components/dashboard/ConfirmedSessionCard.tsx
  - src/components/dashboard/SwipeFileCard.tsx
  - src/components/dashboard/QRCodeCard.tsx
  - src/components/dashboard/FlyerPreview.tsx
  - src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx
key_decisions:
  - Used Write (full-file rewrite) instead of Edit for JSX files with motion elements to avoid partial-replace corruption from mixed HTML/JSX tag matching
duration: 
verification_result: passed
completed_at: 2026-04-07T06:40:09.557Z
blocker_discovered: false
---

# T02: Converted all remaining dashboard page components from motion library to CSS-only transitions and deleted dead PageTransition component, eliminating motion from all dashboard routes

**Converted all remaining dashboard page components from motion library to CSS-only transitions and deleted dead PageTransition component, eliminating motion from all dashboard routes**

## What Happened

Converted six dashboard components (RequestCard, ConfirmedSessionCard, SwipeFileCard, QRCodeCard, FlyerPreview, SwipeFileSection) from motion library animations to CSS-only transitions. AnimatedButton wrappers replaced with div+transition-transform, m.button/m.div/m.a elements replaced with plain HTML elements using Tailwind hover:scale-[1.02] active:scale-[0.97] classes. Stagger animations converted to animate-list/animate-list-item CSS pattern from globals.css. Dead PageTransition.tsx deleted (zero imports confirmed). AnimatedButton.tsx preserved for landing page use.

## Verification

All verification checks passed: grep confirms zero motion imports across all dashboard routes (exit 1), zero AnimatedButton imports in dashboard components (exit 1), PageTransition.tsx deleted, AnimatedButton.tsx preserved. npx tsc --noEmit passed with zero errors. npm run build succeeded generating all 72 static pages.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -r 'from.*motion' src/components/dashboard/ src/components/parent/ParentMobileNav.tsx src/app/(dashboard)/` | 1 | ✅ pass | 50ms |
| 2 | `grep -r 'from.*AnimatedButton' src/components/dashboard/` | 1 | ✅ pass | 50ms |
| 3 | `test ! -f src/components/shared/PageTransition.tsx` | 0 | ✅ pass | 10ms |
| 4 | `npx tsc --noEmit` | 0 | ✅ pass | 3700ms |
| 5 | `npm run build` | 0 | ✅ pass | 14500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/RequestCard.tsx`
- `src/components/dashboard/ConfirmedSessionCard.tsx`
- `src/components/dashboard/SwipeFileCard.tsx`
- `src/components/dashboard/QRCodeCard.tsx`
- `src/components/dashboard/FlyerPreview.tsx`
- `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx`
