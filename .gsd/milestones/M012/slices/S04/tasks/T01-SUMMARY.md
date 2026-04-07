---
id: T01
parent: S04
milestone: M012
key_files:
  - src/components/dashboard/MobileBottomNav.tsx
  - src/components/parent/ParentMobileNav.tsx
key_decisions:
  - Used data-state CSS pattern for More panel open/close instead of AnimatePresence — keeps elements in DOM with pointer-events-none when closed
  - Reused existing animate-list-item class from globals.css for nav entrance animation
duration: 
verification_result: passed
completed_at: 2026-04-07T06:34:16.571Z
blocker_discovered: false
---

# T01: Converted MobileBottomNav and ParentMobileNav from motion library to CSS-only transitions, eliminating ~135KB motion chunk from all dashboard and parent routes

**Converted MobileBottomNav and ParentMobileNav from motion library to CSS-only transitions, eliminating ~135KB motion chunk from all dashboard and parent routes**

## What Happened

Removed all motion imports (AnimatePresence, m from motion/react-client, slideFromBottom from @/lib/animation) from both layout navigation components. MobileBottomNav's AnimatePresence exit animation was replaced with a data-state CSS transition pattern — backdrop and panel stay in DOM, toggled by data-state=open/closed with CSS transitions and pointer-events-none. ParentMobileNav's m.nav with slideFromBottom was replaced with a plain nav using the existing animate-list-item class. Both files now have zero motion dependencies.

## Verification

grep -r "from.*motion" on both files returned exit code 1 (no matches). npx tsc --noEmit passed with zero errors. npm run build succeeded with all dashboard and parent routes compiling cleanly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -r 'from.*motion' src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx` | 1 | ✅ pass | 100ms |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 14200ms |
| 3 | `npm run build` | 0 | ✅ pass | 21100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/MobileBottomNav.tsx`
- `src/components/parent/ParentMobileNav.tsx`
