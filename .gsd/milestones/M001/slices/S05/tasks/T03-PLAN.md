# T03: 05-dashboard-reviews 03

**Slice:** S05 — **Milestone:** M001

## Description

Wire the complete review flow end-to-end: token generation at mark-complete, the public review submission page, and review display on the teacher's public profile.

Purpose: Delivers DASH-05 (mark complete with token generation), REVIEW-01 (parent submits review), REVIEW-02 (reviews on public profile), and REVIEW-03 (review prompt email with real URL). This completes the Phase 5 and MVP feature set.

Output: Updated markSessionComplete, new submitReview action, new /review/[token] page, new ReviewsSection component wired into /[slug].

## Must-Haves

- [ ] "Marking a session complete generates a 64-char hex token, inserts a review stub row, writes amount_cents to the booking, and sends a session-complete email with /review/[token] URL"
- [ ] "A parent visiting /review/[token] sees the review form (student name + teacher name displayed); form accepts 1–5 star rating (required) and optional text + optional first name"
- [ ] "Submitting the review writes rating, text, reviewer_name, sets token_used_at; a second submission attempt is blocked (idempotent)"
- [ ] "After successful review submission the page shows inline success state — no redirect"
- [ ] "Visiting /review/[token] for an already-submitted token shows a graceful 'already submitted' message"
- [ ] "Reviews appear on the teacher's public profile (/[slug]) — hidden entirely for zero reviews, aggregate + 5 most recent shown when reviews exist"
- [ ] "sendSessionCompleteEmail uses /review/[token] URL — not the old stub /review?booking=id"

## Files

- `src/actions/bookings.ts`
- `src/actions/reviews.ts`
- `src/lib/email.ts`
- `src/emails/SessionCompleteEmail.tsx`
- `src/app/review/[token]/page.tsx`
- `src/app/[slug]/page.tsx`
- `src/components/profile/ReviewsSection.tsx`
- `src/__tests__/dashboard-reviews.test.ts`
