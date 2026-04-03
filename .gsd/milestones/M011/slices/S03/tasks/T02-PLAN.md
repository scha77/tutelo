---
estimated_steps: 22
estimated_files: 1
skills_used: []
---

# T02: Rewrite ParentMobileNav with visible labels and run full verification

The parent mobile bottom nav currently renders 5 items + sign out as icon-only tabs. This task makes all labels visible and runs the complete verification suite for the slice.

## Steps

1. In `src/components/parent/ParentMobileNav.tsx`, targeted rewrite:
   - Keep the same overall structure (fixed bottom, safe-area padding, `m.nav` with `slideFromBottom`)
   - Make labels visible: remove `sr-only` class from label spans, use `text-[10px]` visible text below icons (same pattern as updated teacher nav from T01)
   - Sign Out tab also gets visible "Sign out" label
   - Keep active state indicator dot
   - Keep `<form action={signOut}>` server action pattern
   - Ensure all 5 items + Sign Out fit comfortably (6 flex-1 items at mobile width is fine — 5 was the original + Sign Out)

2. Verify the full slice:
   - `npx tsc --noEmit` — must be clean
   - `npx vitest run` — all 474+ tests pass
   - `npx next build` — builds successfully
   - Confirm no imports of `description` from NavItem in parent-nav.ts (it reuses the interface but 5 items don't need descriptions since there's no More menu)

## Must-Haves

- [ ] ParentMobileNav renders all 5 tabs with visible labels (not sr-only)
- [ ] Sign Out has visible label
- [ ] Active state indicator preserved
- [ ] Server action signOut pattern preserved
- [ ] `tsc --noEmit` clean
- [ ] All 474+ tests pass
- [ ] `next build` succeeds

## Inputs

- `src/components/parent/ParentMobileNav.tsx`
- `src/lib/parent-nav.ts`
- `src/lib/nav.ts`

## Expected Output

- `src/components/parent/ParentMobileNav.tsx`

## Verification

npx tsc --noEmit && npx vitest run && npx next build
