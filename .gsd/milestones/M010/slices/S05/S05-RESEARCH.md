# S05 Research — Admin Dashboard

**Slice:** Admin Dashboard  
**Calibration:** Light research — read-only server component using established patterns; no new technology, no migrations, no third-party integrations. The only meaningful decision point is the access-control mechanism (ADMIN_USER_IDS env var gating).

---

## Summary

S05 is the simplest slice in M010. It is a single read-only page (or small set of pages) at `/admin` that shows platform-wide metrics and a recent activity feed. Access is gated by a comma-separated `ADMIN_USER_IDS` env var — non-matching users get a 404. All data comes from existing tables via `supabaseAdmin` (no new migrations needed). The implementation pattern is identical to every other server-component dashboard page in the codebase.

---

## Requirements Owned

- **ADMIN-01** — Admin dashboard with teacher count, booking volume, revenue metrics
- **ADMIN-02** — Admin can view recent activity (signups, bookings, completions)
- **ADMIN-04** — Admin access gated by ADMIN_USER_IDS env var allowlist

---

## What Exists (no admin route yet)

- `/src/app/(dashboard)/dashboard/` — teacher dashboard route group  
- `/src/app/(parent)/` — parent dashboard route group  
- **No `/admin` route group exists.** Nothing to migrate or extend — pure greenfield.

The global `not-found.tsx` at `/src/app/not-found.tsx` renders a styled 404 page. Calling `notFound()` from Next.js anywhere will render this.

---

## Access Control Pattern

**`ADMIN_USER_IDS` env var** — comma-separated Supabase user IDs (e.g. `"uuid1,uuid2"`). Not yet referenced anywhere in the codebase.

Implementation in the admin layout:
1. Call `supabase.auth.getUser()` — consistent with D025 pattern  
2. Parse `process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim())`  
3. If user.id not in allowlist → call `notFound()` (renders 404, no redirect leak)

Why `notFound()` not `redirect()`: 404 reveals nothing about admin route existence to unauthorized users. This matches requirement ADMIN-04 exactly.

---

## Data Available for Metrics (no new migrations needed)

All data comes from existing tables, queried via `supabaseAdmin` (bypasses RLS):

| Metric | Table | Query |
|--------|-------|-------|
| Total teachers | `teachers` | `count(*)` |
| Active teachers (Stripe connected) | `teachers` | `count(*) WHERE stripe_charges_enabled = true` |
| Published teachers | `teachers` | `count(*) WHERE is_published = true` |
| Total bookings | `bookings` | `count(*)` |
| Completed bookings | `bookings` | `count(*) WHERE status = 'completed'` |
| Total revenue (cents) | `bookings` | `sum(amount_cents) WHERE status = 'completed'` |
| Total page views | `page_views` | `count(*) WHERE is_bot = false` |

Revenue: `bookings.amount_cents` (added in migration 0006) stores the captured amount. Sum all `status = 'completed'` rows, divide by 100 for dollars.

**Note:** `supabaseAdmin` must be used for all admin queries — RLS policies on `bookings`, `teachers`, and `page_views` restrict normal clients to per-user rows. The service role client bypasses RLS and sees all rows.

---

## Activity Feed

Recent platform events derived from existing tables (no event log table exists, no new one needed):

| Event type | Source | Query |
|------------|--------|-------|
| New teacher signup | `teachers` | order by `created_at DESC`, limit 10 |
| New booking | `bookings` | order by `created_at DESC`, limit 10 |
| Session completed | `bookings WHERE status = 'completed'` | order by `updated_at DESC`, limit 10 |

Merge and sort by timestamp client-side or with a UNION. For simplicity: fetch the 3 lists separately with `limit 5` each, merge into a typed `ActivityEvent[]` array sorted by `timestamp DESC`, render as a timeline.

---

## Route Structure

```
src/app/(admin)/
  layout.tsx          — auth check + ADMIN_USER_IDS gate → notFound()
  admin/
    page.tsx          — metrics stat cards + activity feed (single page)
```

Route group `(admin)` is the Next.js convention. The actual URL path is `/admin`.

**No sidebar needed** — this is a simple read-only operator tool. A minimal layout with a heading and sign-out link is sufficient. No mobile nav needed (operator tooling, not user-facing).

---

## Implementation Pattern (per established codebase conventions)

### Layout (`(admin)/layout.tsx`)
```typescript
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const allowlist = process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim()) ?? []
  if (!allowlist.includes(user.id)) notFound()

  return (
    <div>
      {/* minimal header with sign-out */}
      <main>{children}</main>
    </div>
  )
}
```

### Page (`admin/page.tsx`)
```typescript
import { supabaseAdmin } from '@/lib/supabase/service'

export default async function AdminPage() {
  // parallel metric queries via supabaseAdmin
  const [totalTeachers, activeTeachers, ...] = await Promise.all([...])

  // activity feed: recent teachers + recent bookings
  const [recentTeachers, recentBookings] = await Promise.all([...])
  // merge into ActivityEvent[], sort by timestamp

  return <div>{/* stat cards + activity feed */}</div>
}
```

Stat card components can be inline — no need for a separate component file given the page is self-contained.

---

## Key Constraints

1. **Use `supabaseAdmin` for all metric queries** — RLS blocks normal clients from cross-user data  
2. **Use `getUser()` not `getClaims()`** — D025 convention, consistent across all auth checks  
3. **`notFound()` not `redirect()`** — 404 for unauthorized admin access (ADMIN-04 spec)  
4. **`ADMIN_USER_IDS` is not yet in `.env.local`** — the env var needs to be documented/added; the page must handle empty/missing env var gracefully (treat as no admins allowed → always 404)  
5. **No new migration needed** — all data from existing tables  
6. **Revenue needs null-guard** — `amount_cents` is nullable (added in 0006); `SUM` in Supabase returns null if no rows; handle with `?? 0`

---

## Natural Task Decomposition

The slice maps cleanly to **two tasks**:

**T01 — Admin layout + access gate + metrics page**
- Create `src/app/(admin)/layout.tsx` with auth + ADMIN_USER_IDS check → `notFound()`
- Create `src/app/(admin)/admin/page.tsx` with `supabaseAdmin` parallel queries
- Stat cards: total teachers, active teachers, total bookings, completed bookings, revenue
- Files: 2 new files

**T02 — Activity feed + tests**
- Extend `admin/page.tsx` with activity feed section (recent signups + bookings)  
- Unit tests: access gate logic (admin allowed, non-admin 404s, missing env var 404s)
- Verify: `npx tsc --noEmit` clean + `npx vitest run` (full 465-test suite still passes + new admin tests)

---

## Verification

```bash
# Type check
npx tsc --noEmit

# Unit tests (full suite)
npx vitest run

# Build check
npx next build
```

Manual verification: visit `/admin` as admin user (ADMIN_USER_IDS set) → see metrics; visit as non-admin → 404.

---

## Skills Discovered

- No new skills needed. This slice uses no new external technologies. Existing codebase patterns cover everything.
