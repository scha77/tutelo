# S02: Directory Pages ISR

**Goal:** Ensure /tutors and /tutors/[category] are both served from Vercel CDN cache. /tutors/[category] already has ISR; verify it. /tutors needs a short-TTL revalidation strategy that works with dynamic search params.
**Demo:** After this: After this: /tutors base page and all /tutors/[category] pages are served from CDN cache; filter UX still works; new published teachers appear in directory within the revalidation window.

## Tasks
