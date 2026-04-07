# S03: Dashboard Query Caching

**Goal:** Extend unstable_cache pattern to all dashboard pages with significant DB queries; implement revalidateTag invalidation on mutations.
**Demo:** After this: After this: navigating away from /dashboard/sessions and back within 30 seconds returns the cached result instantly; confirming a booking request invalidates the requests cache so the count updates correctly.

## Tasks
