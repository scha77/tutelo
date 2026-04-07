# S04 Research: Asset & Bundle Audit

**Depth:** Targeted — known technology (motion library, next/image), known codebase patterns (CSS animation conversion already done for dashboard lists). The audit is about identifying remaining motion consumers in dashboard routes, verifying next/image usage on the profile page, removing dead code, and confirming Vercel Hobby deploys cleanly.

---

## Summary

Motion library (`motion` v12.36) is still imported by **8 dashboard-area components** plus the dashboard layout itself (via `MobileBottomNav`). Since `MobileBottomNav` is in the dashboard layout, **every single dashboard route loads the motion library** (~135KB per chunk, duplicated across route groups). Additionally, `AnimatedButton` (motion wrapper for press/hover feedback) is used by `RequestCard` and `ConfirmedSessionCard`, meaning the requests and sessions pages pull motion through a one-line wrapper. The `PageTransition` component is dead code — zero route imports. The `next/image` audit is nearly a no-op: the banner already uses `next/image` with `fill` + `priority`; the avatar uses Radix `AvatarImage` (renders `<img>`) which is acceptable for small avatars. Build deploys cleanly with no errors.

## Recommendation

Three-task decomposition:

1. **Remove motion from dashboard layout** — Convert `MobileBottomNav` and `ParentMobileNav` to CSS-only animations. This is the highest-impact change because it eliminates the motion dependency from the dashboard layout, removing ~135KB from every dashboard route.

2. **Remove motion from dashboard page components** — Convert `AnimatedButton` (used by `RequestCard`, `ConfirmedSessionCard`) to CSS `:active`/`:hover` transforms. Convert the promote page components (`QRCodeCard`, `FlyerPreview`, `SwipeFileCard`, `SwipeFileSection`) to CSS animations. Delete `PageTransition` (dead code).

3. **Verify next/image + final build audit** — Confirm banner uses `next/image` (✅ already does), verify avatar approach is acceptable, run `npm run build` and confirm no motion chunks appear in dashboard routes, deploy to Vercel Hobby successfully.

---

## Implementation Landscape

### Motion Library Consumer Map

**In dashboard layout (affects ALL dashboard routes):**
| Component | File | Motion APIs Used | Impact |
|-----------|------|-----------------|--------|
| MobileBottomNav | `src/components/dashboard/MobileBottomNav.tsx` | `AnimatePresence`, `m.div` (slide panel, backdrop fade), `m.nav` (slideFromBottom entrance) | **Critical** — in dashboard layout, pollutes every route |

**In dashboard page components (route-specific):**
| Component | File | Motion APIs Used | Dashboard Routes Affected |
|-----------|------|-----------------|--------------------------|
| AnimatedButton | `src/components/shared/AnimatedButton.tsx` | `m.div` (whileTap scale 0.97, whileHover scale 1.02) | requests/, sessions/ (via RequestCard, ConfirmedSessionCard) |
| RequestCard | `src/components/dashboard/RequestCard.tsx` | imports AnimatedButton | requests/ |
| ConfirmedSessionCard | `src/components/dashboard/ConfirmedSessionCard.tsx` | imports AnimatedButton | sessions/ |
| SwipeFileSection | `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx` | `m.div` (stagger container + items) | promote/ |
| QRCodeCard | `src/components/dashboard/QRCodeCard.tsx` | `m.div` (stagger) | promote/ |
| FlyerPreview | `src/components/dashboard/FlyerPreview.tsx` | `m.div` (stagger) | promote/ |
| SwipeFileCard | `src/components/dashboard/SwipeFileCard.tsx` | `m.div` (stagger item) | promote/ |

**In parent layout (affects ALL parent routes):**
| Component | File | Motion APIs Used |
|-----------|------|-----------------|
| ParentMobileNav | `src/components/parent/ParentMobileNav.tsx` | `m.div`, `m.nav` | 

**Dead code:**
| Component | File | Notes |
|-----------|------|-------|
| PageTransition | `src/components/shared/PageTransition.tsx` | Zero imports from any route — safe to delete |

**NOT in scope (public/landing/onboarding — motion is acceptable here):**
- `AnimatedProfile` — profile page scroll reveal (public page, motion is fine)
- `AnimatedSection`, `AnimatedSteps`, `TeacherMockSection` — landing page (public, fine)
- `OnboardingWizard` — onboarding flow (one-time, fine)
- `HeroSection` (landing) + `CTASection` (landing) — use AnimatedButton (public pages, fine)

### CSS Animation Pattern (Already Established)

The codebase already has a working CSS-only stagger animation pattern in `src/app/globals.css`:
```css
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-list-item { animation: fade-slide-up 0.35s ease-out both; }
.animate-list > :nth-child(1) { animation-delay: 0ms; }
/* ... up to 12 children */
```

Used by `AnimatedList` component and `StatsBar` — this is the proven pattern for replacing motion stagger animations.

### Conversion Strategy per Component

**MobileBottomNav (layout — highest priority):**
- More panel backdrop: CSS `opacity` transition via conditional class (`opacity-0 → opacity-100`) + `transition-opacity duration-200`
- More panel slide: CSS `translate-y-full → translate-y-0` + `transition-transform duration-300`
- AnimatePresence exit: Replace with conditional rendering + `hidden` class or `data-state` attribute with CSS transitions
- Bottom nav entrance (slideFromBottom): CSS `animate-fade-slide-up` on mount (one-time animation)
- **Key concern:** AnimatePresence provides exit animations for the More panel. CSS alternative: use `data-[state=open]` / `data-[state=closed]` with `transition` and keep element in DOM, toggling visibility after transition ends via `onTransitionEnd`.

**ParentMobileNav (parent layout — same pattern):**
- Same approach as MobileBottomNav — likely nearly identical code structure.

**AnimatedButton → CSS `:active` / `:hover`:**
```css
.animated-button { transition: transform 0.15s ease; }
.animated-button:hover { transform: scale(1.02); }
.animated-button:active { transform: scale(0.97); }
```
This is a direct CSS replacement — no behavior change. Update `RequestCard` and `ConfirmedSessionCard` imports.

**Promote page components (SwipeFileSection, QRCodeCard, FlyerPreview, SwipeFileCard):**
- All use stagger animations (container + items). Replace with the existing `animate-list` / `animate-list-item` CSS pattern already in globals.css.

### next/image Audit

**HeroSection banner:** ✅ Already uses `next/image` with `fill`, `priority`, `object-cover`. Properly configured with Supabase storage remote pattern in `next.config.ts`.

**HeroSection avatar:** Uses Radix `AvatarImage` (renders plain `<img>`). This is **acceptable** — avatars are small (24×24 to 28×28 CSS pixels), Radix handles loading states with fallback initials, and the complexity of swapping to `next/image` inside Radix Avatar is not worth the minimal LCP gain. The avatar is never the LCP element.

**TeacherCard avatar (directory):** Same Radix `AvatarImage` pattern — acceptable for 14×14 card avatars.

**Banner is the LCP candidate** — it's already `next/image` with `priority`. No further action needed.

### Build Status

Current `npm run build` output:
- ✅ Completes successfully with no errors
- ✅ `/[slug]` shows as `● (SSG)` with 1h revalidation (ISR working from S01)
- ✅ `/tutors/[category]` shows as `● (SSG)` with 1h revalidation (ISR from S02)
- ✅ All dashboard routes show as `ƒ (Dynamic)` (expected)
- ✅ No bundle size warnings or Hobby plan limit errors

### motion Library Chunk Impact

Build produces **~135KB motion core chunks** (duplicated: `860101a5...js` and `a0ffd652...js` at 132KB each, plus `afdf7135...js` at 134KB). These contain `whileTap`, `whileHover`, `whileInView`, `layoutId`, `AnimatePresence` — the full motion runtime. Because `MobileBottomNav` is in the dashboard layout, this chunk is loaded on **every dashboard page load**, not just promote/.

### Shared `animation.ts` File

`src/lib/animation.ts` exports variants used by both dashboard and non-dashboard components. After removing motion from dashboard:
- It will still be needed by landing page components (`AnimatedSection`, `AnimatedSteps`, `TeacherMockSection`)
- And by profile page (`AnimatedProfile`)
- And by onboarding (`OnboardingWizard`)
- **Do not delete it** — it's still used by public-facing pages where motion is appropriate.

### Verification Approach

After conversion:
1. `npm run build` — verify no errors, route table unchanged
2. `grep -r "from.*motion" src/components/dashboard/ src/components/shared/AnimatedButton.tsx src/components/shared/PageTransition.tsx src/app/\(dashboard\)/` — should return zero results
3. Check that motion chunks are no longer loaded by dashboard routes (inspect `.next/static/chunks` for motion content, verify dashboard page bundles don't reference them)
4. Visual smoke test: MobileBottomNav More panel opens/closes smoothly, RequestCard/ConfirmedSessionCard buttons have hover/press feedback, promote page cards stagger in

### Risk Assessment

**Low risk overall:**
- CSS animation conversions are straightforward — the patterns already exist in the codebase
- AnimatedButton → CSS is trivial (3 CSS properties)
- The promote page stagger → animate-list is an established pattern
- MobileBottomNav is the most complex conversion (AnimatePresence exit animation → CSS transitions), but the component is self-contained

**One caution:** The MobileBottomNav More panel uses AnimatePresence for unmount animation. CSS transitions require the element to stay in DOM during the exit transition. Use a `data-state` pattern:
```tsx
<div data-state={moreOpen ? 'open' : 'closed'} className="... data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full transition-transform duration-300">
```
Then hide with `pointer-events-none` + `invisible` when closed (after transition completes), or simply keep in DOM with `translate-y-full` to move off-screen.

---

## Skills Discovered

No new skills needed — this is CSS animation work + Next.js image optimization, both well within existing knowledge. The `react-best-practices` skill is already installed and covers bundle optimization guidance.
