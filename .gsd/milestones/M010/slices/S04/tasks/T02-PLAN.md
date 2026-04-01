---
estimated_steps: 3
estimated_files: 4
skills_used: []
---

# T02: Add Messages nav items and build conversation list pages

Wire Messages into both parent and teacher navigation, then build the conversation list pages that show all threads for the logged-in user with last message preview.

The parent sidebar and mobile nav automatically pick up items from `parentNavItems` in `src/lib/parent-nav.ts`. The teacher sidebar picks up from `navItems` in `src/lib/nav.ts`, and MobileBottomNav also reads from `navItems`.

Both conversation list pages are server components that fetch from GET /api/conversations and render a linked list of conversations.

## Inputs

- ``src/lib/parent-nav.ts` — existing parent nav items array to add Messages item to`
- ``src/lib/nav.ts` — existing teacher nav items array to add Messages item to`
- ``src/app/api/conversations/route.ts` — API endpoint that returns conversation list (created in T01)`
- ``src/app/(parent)/parent/bookings/page.tsx` — parent page pattern (server component, Supabase fetch, card layout)`
- ``src/app/(dashboard)/dashboard/requests/page.tsx` — teacher page pattern (server component with data fetch)`

## Expected Output

- ``src/lib/parent-nav.ts` — Messages nav item added (MessageSquare icon, /parent/messages href)`
- ``src/lib/nav.ts` — Messages nav item added (MessageSquare icon, /dashboard/messages href)`
- ``src/app/(parent)/parent/messages/page.tsx` — parent conversation list page (server component, fetches conversations, renders linked list)`
- ``src/app/(dashboard)/dashboard/messages/page.tsx` — teacher conversation list page (server component, fetches conversations, renders linked list)`

## Verification

npx tsc --noEmit && grep -q 'Messages' src/lib/parent-nav.ts && grep -q 'Messages' src/lib/nav.ts && test -f src/app/(parent)/parent/messages/page.tsx && test -f src/app/(dashboard)/dashboard/messages/page.tsx
