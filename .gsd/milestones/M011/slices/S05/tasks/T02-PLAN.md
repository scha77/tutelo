---
estimated_steps: 9
estimated_files: 4
skills_used: []
---

# T02: Global consistency pass — booking-confirmed, tutors directory, auth pages

Apply consistent card elevation and typography patterns across non-dashboard surfaces:

1. **Booking-confirmed page**: Wrap the confirmation content in an elevated card (rounded-xl border bg-card shadow-sm p-8). Replace the text checkmark with a proper CheckCircle2 lucide icon in a tinted success pill (green). Add a 'Back to Home' link button below.

2. **Tutors directory page**: Add the premium page header pattern (tracking-tight on h1 — already close, verify). The TeacherCard already uses rounded-xl shadow-sm hover:shadow-md — confirmed good. Upgrade the empty state to match the dashboard pattern (centered icon + heading + description).

3. **Auth layout/login page**: The auth layout is minimal (centered, max-w-md). Add a subtle Card wrapper around the LoginForm content for visual containment — rounded-xl border bg-card shadow-sm. Verify the login page header uses tracking-tight.

4. **Run full verification suite**: npx tsc --noEmit + npx vitest run + npx next build

Constraints:
- Do NOT modify any auth logic, data fetching, or API routes
- Keep the tutors page Suspense boundary unchanged
- Booking-confirmed page: keep the Stripe session retrieval logic unchanged

## Inputs

- `src/app/booking-confirmed/page.tsx`
- `src/app/tutors/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/layout.tsx`

## Expected Output

- `Updated booking-confirmed with elevated card and icon`
- `Updated tutors empty state`
- `Updated auth layout with card wrapper`
- `All verification passes`

## Verification

npx tsc --noEmit && npx vitest run && npx next build
