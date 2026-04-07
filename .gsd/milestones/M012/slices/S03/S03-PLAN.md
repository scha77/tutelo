# S03: Dashboard Query Caching

**Goal:** Extend unstable_cache to all remaining dashboard pages with significant DB queries: requests, sessions, students, waitlist. Wire cache invalidation tags to the mutations that change each page's data so caches stay correct.
**Demo:** After this: After this: navigating away from /dashboard/sessions and back within 30 seconds returns the cached result instantly; confirming a booking request invalidates the requests cache so the count updates correctly.

## Tasks
