# S04: Dashboard Polish

**Goal:** All 11 teacher dashboard pages and 5 parent dashboard pages feel premium — better card treatments, visual hierarchy, page headers, stats presentation, empty states, and spacing. The dashboards feel like a cohesive, intentionally designed product — not a generic template.
**Demo:** After this: After this: all 11 teacher dashboard pages and 5 parent dashboard pages feel premium — better card treatments, visual hierarchy, stats presentation, empty states, and spacing. The dashboards feel like a cohesive, intentionally designed product.

## Tasks
- [x] **T01: Upgraded 5 shared dashboard components to premium card standard with rounded-xl elevation, tinted icon pills, SVG star icons, and color-mix subject/status chips** — Upgrade the 5 shared dashboard components used across multiple teacher pages to the premium card standard established in S01/S02. This task must be done first because teacher dashboard pages (T02) render these components — polishing them here means T02 inherits the improvements automatically.

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
  - Estimate: 45m
  - Files: src/components/dashboard/StatsBar.tsx, src/components/dashboard/RequestCard.tsx, src/components/dashboard/ConfirmedSessionCard.tsx, src/components/dashboard/ReviewPreviewCard.tsx, src/components/dashboard/WaitlistEntryRow.tsx
  - Verify: npx tsc --noEmit && npx vitest run
- [x] **T02: Polish all 11 teacher dashboard page shells with headers, card elevation, and consistent containers** — Add the premium page header pattern and upgrade inline card styling across all 11 teacher dashboard pages. The shared components (StatsBar, RequestCard, etc.) were already polished in T01 — this task focuses on page-level layout: headers with subtitles, inline card elevation, page container consistency, and empty state improvements.

**Page header pattern (from Analytics — the gold standard):**
```
<div>
  <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
  <p className="mt-1 text-sm text-muted-foreground">Subtitle describing the page.</p>
</div>
```

**Pages to polish (each needs header + any inline card upgrades):**
1. `dashboard/page.tsx` (Overview) — Add `tracking-tight` to h1, add subtitle. Upgrade inline `AnimatedListItem` cards from `rounded-lg` to `rounded-xl`. Add icon to empty state.
2. `dashboard/requests/page.tsx` — Add subtitle with context. Upgrade empty state with icon.
3. `dashboard/sessions/page.tsx` — Add subtitle. Upgrade past session inline rows from `rounded-lg` to `rounded-xl`.
4. `dashboard/students/page.tsx` — Add subtitle. Upgrade inline student rows from `rounded-lg` to `rounded-xl`. Add avatar initial circle (`h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary`).
5. `dashboard/waitlist/page.tsx` — Add subtitle. Upgrade empty state with icon.
6. `dashboard/settings/page.tsx` — Wrap content in `<div className="max-w-3xl mx-auto">`. Do NOT add `p-6` (AccountSettings already has internal padding). Add page header.
7. `dashboard/availability/page.tsx` — Wrap `<AvailabilityEditor>` in `<div className="p-6">` with page header above it. Do NOT touch AvailabilityEditor internals.
8. `dashboard/page/page.tsx` — Wrap `<PageSettings>` in `<div className="p-6 max-w-3xl">` with page header.
9. `dashboard/promote/page.tsx` — Add subtitle to existing h1.
10. `dashboard/analytics/page.tsx` — Already premium. Only minor: verify icon treatment matches StatsBar pattern (no changes likely needed).
11. `dashboard/connect-stripe/page.tsx` — Wrap content in an elevated card (`rounded-xl border bg-card p-8 shadow-sm`). Add Shield icon trust signal. Keep existing `ConnectStripeButton` and Stripe-branded `bg-[#635BFF]` color.
12. `dashboard/messages/page.tsx` — Add subtitle. Add avatar initial circles for conversation partners.

**Important constraints:**
- Do NOT modify any server-side data fetching, auth checks, or redirects
- Do NOT touch AvailabilityEditor component internals (786 lines)
- Settings page: `max-w-3xl mx-auto` only, NO `p-6` (double-padding risk)
- Connect Stripe: preserve `bg-[#635BFF]` Stripe brand color on button
- Analytics page: already near-premium — minimal or no changes needed
- Keep all `AnimatedList`/`AnimatedListItem` usage unchanged (just upgrade className on items)
  - Estimate: 1h30m
  - Files: src/app/(dashboard)/dashboard/page.tsx, src/app/(dashboard)/dashboard/requests/page.tsx, src/app/(dashboard)/dashboard/sessions/page.tsx, src/app/(dashboard)/dashboard/students/page.tsx, src/app/(dashboard)/dashboard/waitlist/page.tsx, src/app/(dashboard)/dashboard/settings/page.tsx, src/app/(dashboard)/dashboard/availability/page.tsx, src/app/(dashboard)/dashboard/page/page.tsx, src/app/(dashboard)/dashboard/promote/page.tsx, src/app/(dashboard)/dashboard/analytics/page.tsx, src/app/(dashboard)/dashboard/connect-stripe/page.tsx, src/app/(dashboard)/dashboard/messages/page.tsx
  - Verify: npx tsc --noEmit && npx vitest run
- [x] **T03: Polished all 5 parent dashboard pages with tinted icon pills, avatar initial circles, rounded-xl card elevation, and shadow treatments** — Upgrade all 5 parent dashboard pages to match the premium treatment applied to teacher pages in T01/T02, then run the complete verification suite (tsc + vitest + next build) to confirm zero regressions.

**Pages to polish:**
1. `parent/page.tsx` (Overview) — Already has good header with `tracking-tight`. Upgrade stat `<Card>` components: add icon in tinted pill container (`rounded-lg p-2` with `style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}`). The icons (Users, CalendarCheck, History) are already imported — wrap each in a tinted pill.
2. `parent/children/page.tsx` (308 lines) — Add avatar initial circles on child cards. Upgrade any `rounded-lg` cards. The add-child form Card can be elevated with `shadow-sm`.
3. `parent/bookings/page.tsx` — Refine status `<Badge>` styling. Upgrade booking `<Card>` components with `shadow-sm hover:shadow-md transition-shadow`. Add `rounded-xl` to Card className.
4. `parent/payment/page.tsx` — Already has `rounded-lg bg-muted p-3` icon container. Upgrade to `rounded-xl`. The CreditCard icon container is already good — just round up.
5. `parent/messages/page.tsx` — Add avatar initial circles for conversation partners (same pattern as teacher messages in T02). Upgrade Card hover state.

**Important constraints:**
- Parent pages use shadcn `<Card>` component — add className overrides (e.g., `<Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">`) rather than replacing Card with raw divs
- Do NOT modify data fetching, auth, or redirects
- Children page (308 lines): only touch the JSX/className layer, not the add-child form logic or delete dialog
- The parent overview page already has a good header pattern — preserve it
- Use `color-mix(in srgb, var(--primary) 12%, transparent)` for tinted pill backgrounds (NOT var(--accent))

**Final verification (must all pass):**
```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # 474+ tests pass
npx next build            # build succeeds
```
  - Estimate: 1h
  - Files: src/app/(parent)/parent/page.tsx, src/app/(parent)/parent/children/page.tsx, src/app/(parent)/parent/bookings/page.tsx, src/app/(parent)/parent/payment/page.tsx, src/app/(parent)/parent/messages/page.tsx
  - Verify: npx tsc --noEmit && npx vitest run && npx next build
