# S03: Mobile Dashboard & Responsive Polish — Research

**Date:** 2026-03-11

## Summary

S03 delivers MOBILE-01: a bottom tab bar for the dashboard on mobile viewports (≤375px), with the Tutelo logo visible in a mobile header. The scope is narrow and clean — the dashboard already has a working sidebar (`Sidebar.tsx`) that hides at `md:` via `hidden md:flex`. The mobile experience simply has nothing there today; phones see a blank left-side void and the full-width `<main>` with no navigation.

The implementation pattern is clear: add a `MobileBottomNav` client component (a fixed bottom bar with tab icons) and a `MobileHeader` (a thin top bar showing the logo + teacher name on small screens). Both integrate into `layout.tsx` via conditional rendering at `md:hidden`. The `navItems` array, icon set, and pending badge logic already live in `Sidebar.tsx` and can be extracted to a shared constant to avoid drift. The `signOut` server action is already imported — the mobile nav needs the same form-action pattern.

The motion library (`motion` v12.36.0) is already installed and all animation constants are established. The bottom nav entrance (slide up from bottom) can use the existing `fadeSlideUp` or a custom `slideFromBottom` variant. Micro-interaction press feedback on tab buttons uses the established `AnimatedButton` wrapper or inline `whileTap`. This is truly low-risk — the primary risk is that the bottom nav fights with teacher profile's sticky "Book Now" CTA (`BookNowCTA.tsx`), but that component only renders at `/(slug)` routes, not under `/(dashboard)`, so there is no conflict.

## Recommendation

**Single task**: Create `MobileBottomNav` and `MobileHeader` client components, wire them into `dashboard/layout.tsx`. Extract nav items to a shared constant. Add a subtle slide-up entrance animation on the bottom nav. Verify at 375px viewport in browser. Ship.

No new packages needed. No data fetching changes needed. No layout.tsx structural changes beyond adding the two new components.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Nav items list | `navItems` array in `Sidebar.tsx` | Extract to `src/lib/nav.ts` — shared between Sidebar and MobileBottomNav |
| Press feedback | `AnimatedButton` wrapper (`src/components/shared/AnimatedButton.tsx`) | Already established S02 pattern |
| Animation constants | `src/lib/animation.ts` | `fadeSlideUp`, `fastTransition`, `springTransition` all ready |
| Sign out | `signOut` server action + form in `Sidebar.tsx` | Copy the same `<form action={signOut}>` pattern |
| Pending badge | `pendingCount` prop already threaded through layout → Sidebar | Pass same prop to MobileBottomNav |
| Logo | `/logo.png` + `next/image` with `width={28} height={28}` | Same as Sidebar header |

## Existing Code and Patterns

- `src/components/dashboard/Sidebar.tsx` — Source of truth for nav items, icons, active-path logic, pending badge, sign-out form. The `navItems` array and active-state logic (`pathname === href || pathname.startsWith(href + '/')`) must be kept in sync. **Extract to shared constant.**
- `src/app/(dashboard)/dashboard/layout.tsx` — Already passes `teacherName`, `teacherSlug`, `pendingCount` to Sidebar. MobileBottomNav receives the same three props. MobileHeader needs `teacherName` + `teacherSlug`. Layout wraps in `<div className="flex min-h-screen">` — mobile nav is positioned `fixed bottom-0` so it doesn't affect this flow layout.
- `src/components/shared/AnimatedButton.tsx` — `whileTap` scale 0.97 wrapper. Use for tab press feedback.
- `src/lib/animation.ts` — `fastTransition`, `springTransition`, `microPress`. Add `slideFromBottom` variant here for the bottom nav entrance if needed.
- `src/app/(dashboard)/dashboard/template.tsx` — Page transitions via `PageTransition`. Unaffected by S03.
- `src/components/landing/NavBar.tsx` — Example of logo usage (`/logo.png`, `width={32} height={32}`, `rounded-lg`). Mobile header should match this logo style.

## Constraints

- **Sidebar is `hidden md:flex`** — stays exactly as-is. MobileBottomNav is `md:hidden` (complements, doesn't replace).
- **Bottom nav is fixed** — `fixed bottom-0 left-0 right-0 z-50`. The `<main>` content must get `pb-16` (or equivalent) on mobile to avoid content hiding behind the nav bar.
- **`signOut` is a Server Action** — must be called via `<form action={signOut}>`, not a client-side function call. This is the established pattern.
- **pendingCount badge** — Use a green dot or number badge on the Requests tab, matching Sidebar behavior exactly.
- **7 nav items in Sidebar** — All 7 must be accessible on mobile. Bottom tab bar typically shows 4-5 items max. Options: (a) show all 7 with horizontal scroll, (b) show 5 primary items + overflow, (c) show all 7 slightly smaller. Given these are dashboard tabs (not deeply nested), showing all 7 with compact icon-only layout or small icons + short labels is viable at 375px.
- **Logo in mobile header** — Teachers on mobile have no top-left logo. The mobile header replaces the sidebar's logo section. Should show Tutelo logo + teacher name truncated.
- **Brand CSS variables** — `--brand-primary: #3b4d3e`, `--primary`, `--primary-foreground` are all set in globals.css. Use `bg-background border-t border-border` for the nav bar background/border (matches Sidebar's `border-r`).
- **No new packages** — `motion` already installed, `lucide-react` already installed, Tailwind already configured.

## Common Pitfalls

- **Content hidden behind fixed bottom nav** — The `<main>` in `layout.tsx` currently has no bottom padding. On mobile, the last item in any dashboard page will be cut off by the 64px nav bar. Add `pb-16 md:pb-0` to `<main>` (or an equivalent utility).
- **Stripe warning banner + mobile header** — The Stripe warning banner in `layout.tsx` is inside `<main>`. On mobile, with a top header + bottom nav, the screen real estate is tight. The banner is important (Stripe connect prompt) — keep it but ensure it doesn't push content off screen.
- **signOut via form action in a 'use client' component** — The `signOut` action is imported from `@/actions/auth`. In a client component, `<form action={signOut}>` still works because Next.js 16 supports Server Action references in client components. Do NOT call it as a regular function.
- **7 items at 375px** — If showing all 7 tabs, icon-only mode (no labels) with a small active indicator is the cleanest solution at 375px. Adding even 2-char labels may overflow. Use `flex-1` on each tab item so they distribute evenly.
- **Active state on `/dashboard` vs sub-routes** — The existing active logic in Sidebar handles this: `href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/')`. Reuse exactly.
- **Hydration mismatch from `usePathname`** — `usePathname` is client-only. MobileBottomNav must be `'use client'`. This is correct — Sidebar already uses the same pattern.

## Open Risks

- **7 tab items at 375px may be too cramped** — At 375px with 7 equal-width icon buttons, each tab gets ~53px. This is tight but workable with icon-only display (no labels). If it looks bad in browser verification, showing 5 primary items (Overview, Requests, Sessions, Page, Settings) and collapsing Students + Availability into a "More" tab is the fallback — but try icon-only first, it's common in mobile apps.
- **Safe area inset (iPhone notch/home indicator)** — iOS devices have a bottom safe area. Use `pb-safe` or `padding-bottom: env(safe-area-inset-bottom)` on the bottom nav to avoid content overlapping the home indicator. This requires inline styles or a custom Tailwind plugin. Simple fix: add `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the bottom nav container.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js / React | Built-in context | n/a |
| Framer Motion / motion | Installed, established patterns from S02 | n/a |
| Tailwind CSS | Installed, configured | n/a |

No external skills needed — all patterns are established from S01/S02.

## Sources

- Sidebar.tsx — nav items, active-path logic, pending badge, sign-out pattern (codebase)
- layout.tsx — prop threading, layout structure (codebase)
- animation.ts — established animation constants (codebase)
- S02/T04-SUMMARY.md — AnimatedButton wrapper pattern confirmation (codebase)
- DECISIONS.md — "Mobile dashboard uses bottom tab bar (not hamburger menu) — thumb-friendly, app-like feel." (project decisions)
