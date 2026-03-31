---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: TeacherCard component

Create src/components/directory/TeacherCard.tsx. Props: teacher (id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at). Renders: photo (with fallback avatar), name, verified badge if verified_at is set, school, subjects as pill tags (max 3 + overflow count), city/state, hourly rate. Links to /{slug}. Follows design guidelines: 4pt grid, visual hierarchy (name large, secondary info smaller/lighter). Export as named export. No server-side logic — pure presentational component.

## Inputs

- `src/components/profile/HeroSection.tsx (existing card pattern reference)`
- `src/lib/supabase/server.ts`

## Expected Output

- `src/components/directory/TeacherCard.tsx`

## Verification

npx tsc --noEmit passes. Component file exists.
