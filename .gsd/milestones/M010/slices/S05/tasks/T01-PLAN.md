---
estimated_steps: 29
estimated_files: 2
skills_used: []
---

# T01: Create admin layout with access gate, metrics dashboard, and activity feed

Create the complete admin dashboard: (admin) route group layout with ADMIN_USER_IDS env var gating, and admin/page.tsx with stat cards (teacher counts, booking counts, revenue) and recent activity feed (signups, bookings, completions). All queries via supabaseAdmin.

## Steps

1. Create `src/app/(admin)/layout.tsx`:
   - Import `createClient` from `@/lib/supabase/server` and `notFound` from `next/navigation`
   - Call `supabase.auth.getUser()` — if error or no user, `redirect('/login')`
   - Parse `process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim()) ?? []`
   - If `allowlist` is empty or `!allowlist.includes(user.id)`, call `notFound()` (returns 404, not redirect — per ADMIN-04)
   - Render a minimal layout: header with 'Admin Dashboard' title, user email display, sign-out form using the `signOut` server action from `@/actions/auth`, and `{children}` main area
   - No sidebar needed — single-page operator tool

2. Create `src/app/(admin)/admin/page.tsx`:
   - Import `supabaseAdmin` from `@/lib/supabase/service`
   - Run all metric queries in parallel via `Promise.all()`:
     - Total teachers: `supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true })`
     - Active teachers (Stripe connected): `.select('*', { count: 'exact', head: true }).eq('stripe_charges_enabled', true)`
     - Published teachers: `.select('*', { count: 'exact', head: true }).eq('is_published', true)`
     - Total bookings: `supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true })`
     - Completed bookings: `.select('*', { count: 'exact', head: true }).eq('status', 'completed')`
     - Revenue: `.from('bookings').select('amount_cents').eq('status', 'completed')` — sum client-side, null-guard with `?? 0`
   - Render stat cards in a responsive grid (CSS grid or flex, Tailwind utility classes)
   - Format revenue as dollars: `(totalCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`

3. Add activity feed section to the same page:
   - Fetch 3 lists in parallel (within the same Promise.all or a second one):
     - Recent teacher signups: `supabaseAdmin.from('teachers').select('name, created_at').order('created_at', { ascending: false }).limit(5)`
     - Recent bookings: `supabaseAdmin.from('bookings').select('student_name, created_at, status').order('created_at', { ascending: false }).limit(5)`
     - Recent completions: `supabaseAdmin.from('bookings').select('student_name, updated_at, status').eq('status', 'completed').order('updated_at', { ascending: false }).limit(5)`
   - Merge into a typed `ActivityEvent[]` array with `{ type, description, timestamp }` shape
   - Sort by timestamp descending, take first 15
   - Render as a timeline list with event type badges and relative timestamps

4. Verify: `npx tsc --noEmit` passes clean

## Inputs

- ``src/lib/supabase/server.ts` — createClient for auth`
- ``src/lib/supabase/service.ts` — supabaseAdmin for metric queries`
- ``src/actions/auth.ts` — signOut server action`
- ``src/app/not-found.tsx` — global 404 page (used by notFound())`

## Expected Output

- ``src/app/(admin)/layout.tsx` — admin route group layout with ADMIN_USER_IDS access gate`
- ``src/app/(admin)/admin/page.tsx` — metrics stat cards + activity feed page`

## Verification

npx tsc --noEmit
