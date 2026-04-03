---
estimated_steps: 19
estimated_files: 5
skills_used: []
---

# T03: Polish all 5 parent dashboard pages and run full verification suite

Upgrade all 5 parent dashboard pages to match the premium treatment applied to teacher pages in T01/T02, then run the complete verification suite (tsc + vitest + next build) to confirm zero regressions.

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

## Inputs

- ``src/app/(parent)/parent/page.tsx` — current: default shadcn Card stat components, no tinted icon pills`
- ``src/app/(parent)/parent/children/page.tsx` — current: Card-based child list, no avatar initials`
- ``src/app/(parent)/parent/bookings/page.tsx` — current: Card per booking with Badge status, no shadow treatment`
- ``src/app/(parent)/parent/payment/page.tsx` — current: `rounded-lg bg-muted p-3` icon container`
- ``src/app/(parent)/parent/messages/page.tsx` — current: Card with `hover:bg-muted/50`, no avatar initials`
- ``src/components/dashboard/StatsBar.tsx` — reference for tinted icon pill pattern (from T01)`
- ``src/app/(dashboard)/dashboard/messages/page.tsx` — reference for avatar initial pattern (from T02)`

## Expected Output

- ``src/app/(parent)/parent/page.tsx` — stat cards with tinted icon pill containers, rounded-xl`
- ``src/app/(parent)/parent/children/page.tsx` — avatar initials on child cards, elevated card styling`
- ``src/app/(parent)/parent/bookings/page.tsx` — rounded-xl Cards with shadow treatment, refined badges`
- ``src/app/(parent)/parent/payment/page.tsx` — rounded-xl icon container upgrade`
- ``src/app/(parent)/parent/messages/page.tsx` — avatar initial circles, upgraded hover state`

## Verification

npx tsc --noEmit && npx vitest run && npx next build
