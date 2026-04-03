---
estimated_steps: 28
estimated_files: 12
skills_used: []
---

# T02: Polish all 11 teacher dashboard page shells with headers, card elevation, and consistent containers

Add the premium page header pattern and upgrade inline card styling across all 11 teacher dashboard pages. The shared components (StatsBar, RequestCard, etc.) were already polished in T01 — this task focuses on page-level layout: headers with subtitles, inline card elevation, page container consistency, and empty state improvements.

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

## Inputs

- ``src/components/dashboard/StatsBar.tsx` — polished in T01, will render upgraded in Overview page`
- ``src/components/dashboard/RequestCard.tsx` — polished in T01`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — polished in T01`
- ``src/components/dashboard/ReviewPreviewCard.tsx` — polished in T01`
- ``src/components/dashboard/WaitlistEntryRow.tsx` — polished in T01`
- ``src/app/(dashboard)/dashboard/page.tsx` — Overview page shell to polish`
- ``src/app/(dashboard)/dashboard/requests/page.tsx` — Requests page shell`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — Sessions page shell`
- ``src/app/(dashboard)/dashboard/students/page.tsx` — Students page shell`
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — Waitlist page shell`
- ``src/app/(dashboard)/dashboard/settings/page.tsx` — Settings page shell`
- ``src/app/(dashboard)/dashboard/availability/page.tsx` — Availability page shell`
- ``src/app/(dashboard)/dashboard/page/page.tsx` — Page settings page shell`
- ``src/app/(dashboard)/dashboard/promote/page.tsx` — Promote page shell`
- ``src/app/(dashboard)/dashboard/analytics/page.tsx` — Analytics page shell (already premium)`
- ``src/app/(dashboard)/dashboard/connect-stripe/page.tsx` — Connect Stripe page shell`
- ``src/app/(dashboard)/dashboard/messages/page.tsx` — Messages page shell`

## Expected Output

- ``src/app/(dashboard)/dashboard/page.tsx` — premium page header, upgraded inline cards`
- ``src/app/(dashboard)/dashboard/requests/page.tsx` — page header with subtitle, icon empty state`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — page header, upgraded past session rows`
- ``src/app/(dashboard)/dashboard/students/page.tsx` — page header, avatar initials, rounded-xl rows`
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — page header with subtitle, icon empty state`
- ``src/app/(dashboard)/dashboard/settings/page.tsx` — max-w-3xl wrapper, page header`
- ``src/app/(dashboard)/dashboard/availability/page.tsx` — p-6 wrapper, page header`
- ``src/app/(dashboard)/dashboard/page/page.tsx` — p-6 max-w-3xl wrapper, page header`
- ``src/app/(dashboard)/dashboard/promote/page.tsx` — subtitle added to header`
- ``src/app/(dashboard)/dashboard/analytics/page.tsx` — verified/minimal polish`
- ``src/app/(dashboard)/dashboard/connect-stripe/page.tsx` — elevated card wrapper with Shield trust signal`
- ``src/app/(dashboard)/dashboard/messages/page.tsx` — page header, avatar initial circles`

## Verification

npx tsc --noEmit && npx vitest run
