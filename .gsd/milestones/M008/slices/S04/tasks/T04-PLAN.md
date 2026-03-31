---
estimated_steps: 22
estimated_files: 2
skills_used: []
---

# T04: Dashboard analytics page

Create src/app/(dashboard)/dashboard/analytics/page.tsx as an async RSC.

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

## Inputs

- `src/lib/supabase/server.ts`
- `src/lib/nav.ts`

## Expected Output

- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- `src/lib/nav.ts (updated)`

## Verification

npx tsc --noEmit passes. npm run build passes with /dashboard/analytics in route manifest.
