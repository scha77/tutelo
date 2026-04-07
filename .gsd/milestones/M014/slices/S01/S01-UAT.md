# S01: Auth Middleware for Dashboard Streaming — UAT

**Milestone:** M014
**Written:** 2026-04-07T16:37:44.021Z

## UAT: Auth Middleware for Dashboard Streaming

### Test 1: Unauthenticated Dashboard Access
1. Open an incognito/private browser window
2. Navigate to `https://tutelo.app/dashboard`
3. **Expected:** Redirected to `/login?redirect=%2Fdashboard`
4. **Expected:** After logging in, redirected back to `/dashboard`

### Test 2: Unauthenticated Parent Access
1. Navigate to `https://tutelo.app/parent`
2. **Expected:** Redirected to `/login?redirect=%2Fparent`

### Test 3: Dashboard Shell Streaming (Mobile)
1. Log in as a teacher
2. Navigate to `/dashboard` on mobile
3. **Expected:** Layout shell (nav skeleton, bottom nav) appears immediately
4. **Expected:** Sidebar/nav content fills in after data loads (no blank screen)

### Test 4: Public Routes Unaffected
1. Navigate to `https://tutelo.app/` (landing page)
2. **Expected:** Page loads normally, no redirect
3. Navigate to a teacher profile page
4. **Expected:** Page loads normally, no redirect
