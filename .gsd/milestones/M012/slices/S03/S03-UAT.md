# S03: Dashboard Query Caching — UAT

**Milestone:** M012
**Written:** 2026-04-07T06:00:11.553Z

# S03 UAT: Dashboard Query Caching

## Overview
This UAT validates that the four dashboard data pages (requests, sessions, students, waitlist) return cached responses when accessed within the 30s TTL window, and that mutations via server actions immediately invalidate those caches.

## Preconditions
- Teacher with ID `teacher-1` exists in database with published profile
- Teacher is logged into dashboard
- Parent with pending booking request exists for the teacher
- Session bookings with mixed statuses (confirmed, completed) exist
- Browser network DevTools or server logs available to observe Supabase queries

## Test Cases

### Test 1: Requests Page — Cache Hit on Re-navigation (30s window)
**Scenario:** Navigate to /dashboard/requests, navigate away, return within 30 seconds

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/requests | Page loads, shows pending requests. Supabase query logs show 1x `.from('bookings').eq('status', 'requested')...` call |
| 2 | Note the current request count (e.g., 3 pending) | Count displayed on page |
| 3 | Navigate away (click Sessions tab) | Page hidden, cache remains in memory |
| 4 | Navigate back to Requests (click Requests tab) within 15 seconds | Page reloads instantly with same 3 requests showing. **No new Supabase query** in logs for the 2nd load. Cache hit confirmed |
| 5 | Wait 35 seconds total from step 1, then navigate back | Page loads again with fresh Supabase query (cache expired after 30s). Server logs show 2nd query call |

**Pass Criteria:** Step 4 shows instant load with no new query; Step 5 shows new query after TTL expires.

---

### Test 2: Sessions Page — Cache Hit on Two Parallel Queries
**Scenario:** Sessions page caches both upcoming and past bookings queries

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/sessions | Page loads showing upcoming (confirmed/payment_failed) and past (completed) sessions. Server logs show exactly 2 Supabase queries (one for each filter: `.in('status', ['confirmed', 'payment_failed'])` and `.eq('status', 'completed')`) |
| 2 | Count upcoming sessions (e.g., 5) and past sessions (e.g., 10) | Both counts displayed |
| 3 | Navigate to another dashboard page (Students) | Sessions cache retained |
| 4 | Navigate back to Sessions within 20 seconds | Page loads instantly with same 5 upcoming, 10 past. **No new Supabase queries** in logs. |
| 5 | Wait 35 seconds total, navigate back | Fresh query issued, cache refreshed |

**Pass Criteria:** Step 4 shows no new queries; Step 5 shows 2 new queries (parallel to both statuses).

---

### Test 3: Students Page — Grouping Logic Cached (Query + Deduplication)
**Scenario:** Students page caches both the Supabase query AND the Map-based grouping logic

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Create 3 sessions with the same student, different booking dates | Student appears 3 times in Supabase result |
| 2 | Navigate to /dashboard/students | Page loads. Shows grouped result: 1 unique student with 3 bookings listed. Server logs show 1x Supabase query for all student sessions |
| 3 | Navigate away (Settings tab) | Cache retained |
| 4 | Navigate back within 25 seconds | Instant load, **same grouped display, no new Supabase query**. Grouping logic was cached, not recomputed |
| 5 | After 35 seconds, navigate back | Fresh query issued, grouped result recomputed |

**Pass Criteria:** Step 4 shows no new query and correct grouped display; Step 5 shows new query.

---

### Test 4: Waitlist Page — Cache Hit
**Scenario:** Waitlist page caches the single waitlist query

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/waitlist | Page loads showing 7 waitlist entries. Server logs show 1x Supabase query for `status = 'waitlist'` |
| 2 | Navigate away | Cache retained |
| 3 | Return within 20 seconds | Instant load, same 7 entries, **no new query** |
| 4 | After 35 seconds, return | Fresh query issued |

**Pass Criteria:** Step 3 shows cache hit; Step 4 shows cache miss and fresh query.

---

### Test 5: acceptBooking Mutation — Invalidates Requests Cache
**Scenario:** Accepting a booking request invalidates the requests page cache

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/requests | Page shows 5 pending requests. Supabase query logged |
| 2 | Click "Accept" on one request | Modal opens, accepts booking. Server calls `acceptBooking` action. updateTag(`requests-${teacher.id}`) fires, invalidating requests cache |
| 3 | Immediately navigate back to Requests page | Page shows 4 pending requests (**not 5**). **Fresh Supabase query** logged (cache was invalidated, not waiting for 30s TTL). The accepted request is gone |

**Pass Criteria:** Step 3 shows fresh query and updated count (4 instead of 5).

---

### Test 6: declineBooking Mutation — Invalidates Requests Cache
**Scenario:** Declining a booking request invalidates the requests page cache

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/requests | Page shows 4 pending requests |
| 2 | Click "Decline" on one request | Booking status changes to 'cancelled'. updateTag(`requests-${teacher.id}`) fires |
| 3 | Immediately navigate back to Requests | Page shows 3 pending requests. Fresh Supabase query issued |

**Pass Criteria:** Count updated immediately, cache invalidated.

---

### Test 7: markSessionComplete Mutation — Invalidates Sessions + Students Caches
**Scenario:** Completing a session invalidates both sessions and students caches

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Navigate to /dashboard/sessions | Shows 5 upcoming, 8 past |
| 2 | Navigate to /dashboard/students | Shows 12 unique students |
| 3 | Go back to Sessions, mark one session complete | Action fires updateTag(`sessions-${teacher.id}`) + updateTag(`students-${teacher.id}`) |
| 4 | Immediately navigate back to Sessions | Shows 4 upcoming, 9 past. **Fresh query issued** (not cached) |
| 5 | Immediately navigate to Students | May show 12 or 13 students (depending on whether the completed student list changes). **Fresh query issued** (cache invalidated) |

**Pass Criteria:** Steps 4 and 5 both show fresh queries, cache hit does not occur.

---

### Test 8: cancelSession Mutation — Invalidates Sessions Cache
**Scenario:** Cancelling a session invalidates the sessions cache

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | /dashboard/sessions shows 5 upcoming sessions |
| 2 | Click cancel on one upcoming session | updateTag(`sessions-${teacher.id}`) fires |
| 3 | Immediately navigate back to Sessions | Shows 4 upcoming sessions. Fresh Supabase query issued |

**Pass Criteria:** Fresh query, cache invalidated.

---

### Test 9: removeWaitlistEntry Mutation — Invalidates Waitlist Cache
**Scenario:** Removing a waitlist entry invalidates the waitlist cache

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | /dashboard/waitlist shows 7 waitlist entries |
| 2 | Click "Remove from waitlist" on one entry | updateTag(`waitlist-${teacher.id}`) fires |
| 3 | Immediately navigate back to Waitlist | Shows 6 entries. Fresh Supabase query issued (cache invalidated) |

**Pass Criteria:** Fresh query, count updated.

---

### Test 10: No Cache Invalidation on Non-Mutating Actions
**Scenario:** Viewing/navigating does not trigger invalidation, respects 30s TTL

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | /dashboard/requests, note count = 5, note timestamp in logs (e.g., T=0s) |
| 2 | Navigate to Sessions (no mutations) | Sessions data cached if accessed before, Requests cache still fresh |
| 3 | Return to Requests at T=15s | **Cache hit, no new query**, still shows 5 requests |
| 4 | Return to Requests at T=32s | **Cache miss, fresh query**, shows any new pending requests from other sources |

**Pass Criteria:** Step 3 uses cache (no query), Step 4 fetches fresh (new query after TTL).

---

## Edge Cases

### Edge Case 1: Rapid Mutations (Multiple updateTag calls)
**Scenario:** Declining one request and immediately accepting another

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | /dashboard/requests shows [Request A, Request B, Request C] |
| 2 | Decline Request A (updateTag fires) | Cache invalidated |
| 3 | Before navigating away, Accept Request B (updateTag fires again) | Second updateTag call, requests cache remains invalidated |
| 4 | Navigate to /dashboard/requests | Fresh query shows only [Request C] (A declined, B accepted) |

**Pass Criteria:** Multiple updateTag calls don't cause conflicts; final state is correct.

---

### Edge Case 2: Network Latency — Query Takes > 1 second
**Scenario:** Slow network causes cached fresh data to be returned before slow query completes

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Page loads with 30s cache hit (instant) | Cached data returned immediately |
| 2 | Slow Supabase query is still executing in background | Page already rendered with cached data, user sees no loading spinner (cache was fresh) |
| 3 | Query completes after 3 seconds | Background data refresh completes (not rendered, cache will expire at T=30s naturally) |

**Pass Criteria:** UX is fast (cached data shown immediately); background query doesn't block user.

---

## Success Criteria Summary
1. ✅ All four pages show cache hits within 30s TTL (no duplicate queries)
2. ✅ Cache misses occur after 30s TTL expires (new queries issued)
3. ✅ Mutations invalidate correct cache tags immediately (fresh queries on re-nav)
4. ✅ No "phantom" updateTag calls or double-invalidation issues
5. ✅ Students page grouping is cached, not recomputed on every access
6. ✅ Sessions page parallel queries both cached as one combined entry
7. ✅ Edge case: Multiple rapid mutations handled correctly
8. ✅ Edge case: Network latency does not block cached response delivery
