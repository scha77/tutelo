---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T02: Slim down dashboard layout auth gate

1. Read current layout.tsx
2. Remove the redirect('/login') for missing user — middleware handles this now
3. Keep getTeacher() for teacher name/slug (layout still needs it for sidebar)
4. Keep redirect('/onboarding') for users without teacher row (middleware can't check this without DB)
5. Verify layout streams shell before page data

## Inputs

- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/middleware.ts`

## Expected Output

- `src/app/(dashboard)/dashboard/layout.tsx`

## Verification

Dashboard layout renders skeleton immediately while page data loads. Unauthenticated requests never reach the layout.
