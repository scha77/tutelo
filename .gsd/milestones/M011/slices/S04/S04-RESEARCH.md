# S04: Dashboard Polish — Research

**Gathered:** 2026-04-03
**Depth:** Targeted — established technology (Tailwind/motion/shadcn), known codebase, no novel architecture needed.

---

## Summary

S04 polishes all 11 teacher dashboard pages and 5 parent dashboard pages. The work is straightforward application of established M011 patterns (from S01/S02) to dashboard surfaces. No new dependencies, no new architecture. The primary risk is scope: "polish" requires a clear, consistent definition of done per page to avoid runaway scope. The key insight is that the dashboard pages are structurally sound and functionally complete — they just need the visual layer upgraded to match the premium bar set by S01/S02.

---

## Requirements Targeted

- **UI-04** — Teacher dashboard visual polish (all 11 pages)
- **UI-05** — Parent dashboard visual polish (all 5 pages)
- **UI-08** — Never look like a generic template (constraint)
- **UI-09** — Never feel clunky or confusing (constraint — partially validated in S03)

---

## Implementation Landscape

### Teacher Dashboard — 11 Pages

**Layout wrapper** (`src/app/(dashboard)/dashboard/layout.tsx`):
- Amber Stripe banner uses raw hardcoded colors — could get a more premium treatment with a rounded/bordered inner banner style
- No changes needed to auth/nav logic

**Page-by-page audit:**

| Page | File | Current State | Polish Needs |
|------|------|---------------|--------------|
| Overview | `dashboard/page.tsx` | `p-6 max-w-3xl`, plain h1, `rounded-lg border bg-card` items | Page header section (h1 + subtitle), `rounded-xl` elevated cards for upcoming sessions, improved empty state with icon |
| Requests | `dashboard/requests/page.tsx` | `p-6 max-w-2xl`, plain h1 | Page header with subtitle/count, RequestCard polish |
| Sessions | `dashboard/sessions/page.tsx` | `p-6 max-w-3xl`, plain h1 | Page header, section dividers, past sessions table → elevated rows |
| Students | `dashboard/students/page.tsx` | `p-6 max-w-3xl`, plain h1 | Page header with count, avatar initials on student rows, elevated cards |
| Waitlist | `dashboard/waitlist/page.tsx` | `p-6 max-w-3xl`, plain h1 | Page header, better empty state with icon, WaitlistEntryRow refinement |
| Page | `dashboard/page/page.tsx` | Delegates to `<PageSettings>` | PageSettings already has section structure; needs section card elevation and consistent section headers |
| Availability | `dashboard/availability/page.tsx` | Delegates to `<AvailabilityEditor>` | AvailabilityEditor has `h2 text-xl font-semibold` — needs `p-6` wrapper + page-level header |
| Promote | `dashboard/promote/page.tsx` | `p-6 max-w-3xl`, plain h1 | Page header, QRCodeCard and FlyerPreview already have `rounded-lg border bg-card` |
| Analytics | `dashboard/analytics/page.tsx` | Has `tracking-tight`, StatCards use `rounded-xl border bg-card p-5` | **Best of the bunch** — already premium. Minor: stat card icons could use a tinted bg pill similar to S01 pattern |
| Messages | `dashboard/messages/page.tsx` | `p-6 max-w-2xl`, conversation `Card` items with `hover:bg-muted/50` | Add avatar initials, unread badge patterns, consistent hover elevation |
| Settings | `dashboard/settings/page.tsx` | Delegates to 4 sub-components; no page-level `p-6` | Needs `p-6 max-w-3xl` wrapper; AccountSettings/CapacitySettings/SessionTypeManager/SchoolEmailVerification sections should be visually separated with border cards |
| Connect Stripe | `dashboard/connect-stripe/page.tsx` | `p-6 max-w-md`, plain layout | Trust signal, Stripe branding, better CTA treatment |

**Shared dashboard components needing polish:**

| Component | Current | Needs |
|-----------|---------|-------|
| `StatsBar.tsx` | `rounded-lg bg-muted/30 p-4 shadow-sm` | Upgrade to `rounded-xl`, taller padding, icon in tinted pill (like Analytics StatCard pattern) |
| `RequestCard.tsx` | `rounded-lg border bg-card p-4 shadow-sm` | `rounded-xl`, accent-colored subject chip (color-mix pattern from S01/D043), elevated hover state |
| `ConfirmedSessionCard.tsx` | `rounded-lg border bg-card p-4 shadow-sm` | Same as RequestCard — `rounded-xl`, status chip color unification (use CSS var pattern) |
| `ReviewPreviewCard.tsx` | `rounded-lg border bg-card p-4 shadow-sm` | `rounded-xl`, SVG stars (already done in S01 ReviewsSection — replicate here), consistent with profile page cards |
| `WaitlistEntryRow.tsx` | `rounded-lg border bg-card px-4 py-3` | `rounded-xl`, better status badge styling |
| `AnimatedList` / items | `rounded-lg border bg-card p-3` (inline in overview) | Extract item pattern to use consistent `rounded-xl` card |
| `MobileHeader.tsx` | Functional, minimal | Fine as-is — already clean |
| `Sidebar.tsx` | Works well | Minor: active state could use stronger visual treatment |

### Parent Dashboard — 5 Pages

| Page | File | Current State | Polish Needs |
|------|------|---------------|--------------|
| Overview | `parent/page.tsx` | `p-6 md:p-10`, 3 stat `Card` components, quick actions | Stats cards already use `<Card>` but default shadcn — needs icon tinted pills, stronger stat hierarchy |
| Children | `parent/children/page.tsx` | `p-6 md:p-10`, grid of `Card` components | Already fairly polished with Dialog for delete; child cards could use initial avatars; add-form Card could be elevated |
| Bookings | `parent/bookings/page.tsx` | `<Card>` with `<CardContent pt-6>` per booking | BookingCard pattern needs status badge refinement (current: `Badge variant=statusVariant`) |
| Payment | `parent/payment/page.tsx` | Clean card-based layout with `<CreditCard>` icon in `bg-muted p-3` | **Good** — already has tinted icon container, just needs `rounded-xl` elevation |
| Messages | `parent/messages/page.tsx` | Same as teacher messages — `Card` + `hover:bg-muted/50` | Same needs as teacher messages: avatar initials |

---

## Established Patterns (from S01/S02 — planner must use these)

1. **Card elevation standard:** `rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow` — established in `ReviewsSection.tsx` and `SessionTypeSelector.tsx`
2. **Accent-colored chips (D043):** `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}` — for subject/status chips
3. **Page header pattern (Analytics):** `<div>` + `<h1 className="text-2xl font-bold tracking-tight">` + `<p className="mt-1 text-sm text-muted-foreground">subtitle</p>`
4. **Empty state with icon:** `<Icon className="h-12 w-12 text-muted-foreground/50 mb-4">` + h2 + p (established in bookings, children, messages pages — already consistent enough)
5. **Stat card with tinted icon container:** Used in Analytics `StatCard` with `<Icon className="h-4 w-4" />` inside a pill; and in Payment page (`rounded-lg bg-muted p-3`)
6. **StatsBar already uses `staggerContainer/staggerItem`** from animation.ts — keep this
7. **Status badge chips:** `rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-sm` pattern (in ConfirmedSessionCard) — should be upgraded to use design system tokens instead of raw colors where possible

---

## Key Design Decisions Needed

1. **`rounded-xl` everywhere or selectively?** The Analytics page already uses `rounded-xl` for stat cards. S01 profile reviews use `rounded-xl`. The dashboard currently mixes `rounded-lg` (older components) and `rounded-xl` (newer). Decision: upgrade all dashboard card surfaces to `rounded-xl` for consistency.

2. **Page header pattern:** Analytics already has the best pattern (`tracking-tight` h1 + `text-sm text-muted-foreground` subtitle). The other 10 teacher pages just have a bare h1. Add consistent subtitle/description to all pages that lack one.

3. **Settings page lacks `p-6` wrapper:** `dashboard/settings/page.tsx` returns `<div className="space-y-8">` with sub-components that each have their own `p-6` via `AccountSettings`. This is inconsistent — page-level padding should be added so Settings reads at the same rhythm as other pages. However, `AccountSettings` already has `p-6` internally. This needs careful handling to avoid double-padding.

4. **`RequestCard` and `ConfirmedSessionCard` buttons:** Currently use raw hardcoded color strings (`bg-green-600`, `border-red-300`). The planner should decide whether to convert to shadcn Button variants or keep inline (with upgraded radius/padding). Given S01/S02 precedent, keeping inline but upgrading styling is fine — no need to refactor to Button components.

5. **StatsBar (teacher overview):** Currently `rounded-lg bg-muted/30`. Upgrade to `rounded-xl bg-card border shadow-sm` to match the Analytics StatCard pattern, with icon in a tinted container.

---

## File Inventory (files to touch)

### High impact — page shells (layout improvements):
- `src/app/(dashboard)/dashboard/page.tsx` — header, card elevation
- `src/app/(dashboard)/dashboard/requests/page.tsx` — header + empty state
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — section headers, past row elevation
- `src/app/(dashboard)/dashboard/students/page.tsx` — header, avatar initials on rows
- `src/app/(dashboard)/dashboard/waitlist/page.tsx` — header
- `src/app/(dashboard)/dashboard/settings/page.tsx` — p-6 wrapper coordination
- `src/app/(dashboard)/dashboard/connect-stripe/page.tsx` — trust signal, CTA
- `src/app/(parent)/parent/page.tsx` — stat cards
- `src/app/(parent)/parent/bookings/page.tsx` — BookingCard badge refinement

### Medium impact — shared components:
- `src/components/dashboard/StatsBar.tsx` — rounded-xl, icon pills
- `src/components/dashboard/RequestCard.tsx` — rounded-xl, subject chip
- `src/components/dashboard/ConfirmedSessionCard.tsx` — rounded-xl, status chips
- `src/components/dashboard/ReviewPreviewCard.tsx` — rounded-xl, SVG stars
- `src/components/dashboard/WaitlistEntryRow.tsx` — rounded-xl
- `src/components/dashboard/AccountSettings.tsx` — section card elevation
- `src/components/dashboard/PageSettings.tsx` — section header consistency
- `src/components/dashboard/SessionTypeManager.tsx` — already `rounded-xl border bg-card p-6`; minor refinements

### Low impact — already decent:
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — near-premium already; just align icon treatment with StatsBar
- `src/app/(parent)/parent/children/page.tsx` — already has avatar concept; add initials + grade chip styling
- `src/app/(parent)/parent/payment/page.tsx` — already has good icon container; upgrade to `rounded-xl`
- `src/components/dashboard/AvailabilityEditor.tsx` — functional complex UI; page wrapper only; avoid touching internals
- `src/components/dashboard/FlyerPreview.tsx` (56 lines) — check and polish if needed
- `src/components/parent/ParentSidebar.tsx` — minor active state
- `src/components/dashboard/Sidebar.tsx` — minor active state

---

## Slicing Strategy

The work naturally divides into 2–3 tasks:

**T01 — Shared component polish** (StatsBar, RequestCard, ConfirmedSessionCard, ReviewPreviewCard, WaitlistEntryRow)
- These are used across multiple pages; polish them first so page updates inherit the improvements
- No functional changes — pure visual upgrade
- Verify: `npx tsc --noEmit` + `npx vitest run` (no test changes expected — these components have behavioral tests that don't assert CSS)

**T02 — Teacher dashboard page polish** (all 11 pages)
- Add page header pattern, upgrade inline cards to rounded-xl, add avatar initials where appropriate
- Settings page wrapper coordination
- Connect Stripe CTA upgrade

**T03 — Parent dashboard page polish** (all 5 pages) + final verification
- Overview stats, BookingCard refinement, Children avatar initials
- Full suite: `npx tsc --noEmit` + `npx vitest run` + `npx next build`

---

## What to Watch Out For

1. **AvailabilityEditor (786 lines):** Don't touch internals. The page shell (`dashboard/availability/page.tsx`) just renders `<AvailabilityEditor>` — add a page-level `<div className="p-6">` wrapper there without touching the component.

2. **AccountSettings double-padding:** AccountSettings internally renders `<div className="space-y-6 p-6">`. The settings page renders `<div className="space-y-8">` without padding. Don't add `p-6` to the page wrapper — it would double-pad. Instead, add a max-width only: `max-w-3xl mx-auto`.

3. **Tests don't assert on CSS:** The 474 tests are behavioral (actions, routing, Supabase queries). No snapshot tests or visual regression tests for CSS classes. Changing `rounded-lg` to `rounded-xl` is safe.

4. **`color-mix(in srgb, var(--accent))` in teacher dashboard context:** The teacher dashboard does NOT set a custom `--accent` CSS variable (unlike the `[slug]` profile page which overrides it with `teacher.accent_color`). Dashboard uses the default `--accent: oklch(0.97 0 0)` (near-white). So accent-colored chips in the dashboard should use the brand primary (`var(--primary)` = `#3b4d3e`) not accent. Use `color-mix(in srgb, var(--primary) 12%, transparent)` for dashboard chip backgrounds.

5. **`ConnectStripeButton.tsx` uses raw `bg-[#635BFF]`:** This is intentional Stripe brand color — preserve it.

6. **No AnimatedList on parent pages:** Parent dashboard pages don't use `AnimatedList` — they use static lists or `Card` components. Adding `AnimatedList` to parent pages would be a nice enhancement but is not required by the slice.

---

## Verification

```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # 474 tests pass
npx next build            # build succeeds (67 routes)
```

No new tests needed. All changes are CSS/layout only — existing behavioral tests remain valid.
