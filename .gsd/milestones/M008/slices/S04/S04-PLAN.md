# S04: Page View Tracking & Dashboard Analytics

**Goal:** Track page views on /[slug] teacher profiles via a lightweight API route, storing in a page_views table with bot filtering. Add a /dashboard/analytics page showing the full conversion funnel: views, booking form opens, completed bookings, and conversion rate.
**Demo:** After this: Teacher opens /dashboard/analytics and sees 47 total views, 12 booking form opens, 3 completed bookings, 6.4% conversion rate.

## Tasks
- [x] **T01: Migration 0013: page_views table with indexes and RLS SELECT policy for dashboard reads.** — Create supabase/migrations/0013_page_views.sql.

Table definition:
```sql
CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL PRIMARY KEY,
  teacher_id    UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT,
  is_bot        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Index for fast per-teacher aggregation (most common query)
CREATE INDEX IF NOT EXISTS page_views_teacher_id_idx
  ON page_views(teacher_id, viewed_at DESC);

-- RLS: only service role can insert (track-view API uses supabaseAdmin)
-- No need for user-facing RLS policies on this table at MVP
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
```

Also add a booking_form_opens column concept: we don't track this server-side yet (that needs a client-side event). For MVP the funnel shows:
- Views: COUNT(*) from page_views WHERE is_bot = false
- Booking form opens: deferred (tracked client-side in a future milestone)
- Completed bookings: COUNT(*) from bookings WHERE teacher_id = ? AND status = 'completed'
  - Estimate: 20m
  - Files: supabase/migrations/0013_page_views.sql
  - Verify: File exists. grep for CREATE TABLE page_views.
- [x] **T02: Bot filter utility with 8 passing tests.** — Create src/lib/utils/bot-filter.ts with isBot(userAgent: string | null): boolean.

Bot detection logic — check for known crawler UA substrings (case-insensitive):
```ts
const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
  'semrushbot', 'ahrefsbot', 'dotbot', 'petalbot', 'applebot',
  'crawler', 'spider', 'headlesschrome', 'python-requests', 'curl/',
]
```

Return true if any pattern matches (or if userAgent is null/empty).

Also create src/lib/utils/bot-filter.test.ts (Vitest) with:
- isBot(null) returns true
- isBot('') returns true
- isBot('Googlebot/2.1 (+http://www.google.com/bot.html)') returns true
- isBot('Bingbot/2.0') returns true
- isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...) AppleWebKit/605.1.15') returns false (real mobile browser)
- isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120') returns false (real desktop browser)
- isBot('python-requests/2.31.0') returns true
- isBot('curl/7.88.0') returns true
Total: 8 tests.
  - Estimate: 30m
  - Files: src/lib/utils/bot-filter.ts, tests/unit/bot-filter.test.ts
  - Verify: npx vitest run tests/unit/bot-filter.test.ts passes (8 tests).
- [x] **T03: Track-view API route built and /[slug] page wires fire-and-forget insert with bot filtering.** — Create src/app/api/track-view/route.ts.

POST handler:
1. Parse body: { teacherId: string }. Return 400 if missing.
2. Read User-Agent from request headers.
3. Call isBot(userAgent) from bot-filter.ts.
4. Insert row into page_views via supabaseAdmin (service role — anonymous caller, no session).
5. Return 201 { ok: true }.
6. On any error: return 500 { error: '...' }, never throw.

In src/app/[slug]/page.tsx, add a non-blocking fetch call inside the server component after the teacher query succeeds:
```ts
// Fire-and-forget page view tracking — do NOT await
// Using a relative URL won't work in RSC; use absolute URL or a direct DB insert
```

Actually, for RSC performance: instead of a fetch from the server component (which would be server → server), do the insert directly in the page using supabaseAdmin. But supabaseAdmin contains the service role key — keep it server-only. Pattern:
- Import createAdminClient from @/lib/supabase/admin (create this if not exists)
- After the teacher query succeeds, run a fire-and-forget insert:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
// in the page component:
const headersList = await headers()
const userAgent = headersList.get('user-agent')
if (!isBot(userAgent) && teacher) {
  createAdminClient()
    .from('page_views')
    .insert({ teacher_id: teacher.id, user_agent: userAgent, is_bot: false })
    .then(() => {}) // truly non-blocking
    .catch(() => {}) // swallow errors — never block page render
}
```

Check if src/lib/supabase/admin.ts exists first. If it does, use it. If not, create it:
```ts
import { createClient } from '@supabase/supabase-js'
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```
  - Estimate: 60m
  - Files: src/app/api/track-view/route.ts, src/lib/supabase/admin.ts, src/app/[slug]/page.tsx, src/lib/utils/bot-filter.ts
  - Verify: npx tsc --noEmit passes. npm run build passes. /api/track-view in route manifest.
- [x] **T04: Dashboard analytics page built with funnel visualization, stat cards, and nav item. Build passes.** — Create src/app/(dashboard)/dashboard/analytics/page.tsx as an async RSC.

Data to fetch:
1. Get teacher via supabase.auth.getUser() — same pattern as all dashboard pages.
2. Total views: SELECT COUNT(*) FROM page_views WHERE teacher_id = ? AND is_bot = false
3. Views last 30 days: SELECT COUNT(*) FROM page_views WHERE teacher_id = ? AND is_bot = false AND viewed_at >= NOW() - INTERVAL '30 days'
4. Completed bookings: SELECT COUNT(*) FROM bookings WHERE teacher_id = ? AND status = 'completed'
5. Requested/pending bookings (proxy for 'engaged'): SELECT COUNT(*) FROM bookings WHERE teacher_id = ? AND status IN ('requested', 'pending', 'confirmed')

Conversion rate: (completed bookings / total views) * 100, show as X.X%

UI layout:
- Page title 'Analytics'
- 4 stat cards in a 2x2 grid (desktop: 4-col row):
  - Total page views (all time, excl bots)
  - Views last 30 days
  - Completed bookings
  - Conversion rate (completed / total views)
- A simple funnel section below showing the stages with counts
- Note: 'Booking form opens' tracked in a future update (placeholder card showing '--')

Add Analytics nav item to src/lib/nav.ts between Promote and Settings:
```ts
import { BarChart2 } from 'lucide-react'
{ href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 }
```
  - Estimate: 60m
  - Files: src/app/(dashboard)/dashboard/analytics/page.tsx, src/lib/nav.ts
  - Verify: npx tsc --noEmit passes. npm run build passes with /dashboard/analytics in route manifest.
