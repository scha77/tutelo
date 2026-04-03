---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Upgrade CredentialsBar with accent-colored subject chips and structured layout

Restructure the flat credentials bar into a more intentional layout with accent-colored subject chips. Subject badges get inline styles using color-mix: `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}` — DO NOT use the Tailwind bg-accent utility (it conflicts with the teacher's accent color override on <main>). Grade level chips get a lighter treatment. Rate display gets font-semibold text-base with tabular-nums. Verified badge keeps emerald + CheckCircle but gets a subtle background pill. Consider a two-section layout: subjects+grades row, then meta items. The component reads accent color from the CSS variable, not a prop — this is the established pattern.

## Inputs

- ``src/components/profile/CredentialsBar.tsx` — current flat flex-wrap with secondary/outline badges`
- ``src/components/profile/HeroSection.tsx` — reference for updated visual style from T01`

## Expected Output

- ``src/components/profile/CredentialsBar.tsx` — upgraded with accent-colored subject chips, structured layout, prominent rate display`

## Verification

npx tsc --noEmit && npx vitest run --reporter=dot 2>&1 | tail -3
