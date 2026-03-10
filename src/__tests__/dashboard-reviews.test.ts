import { describe, it } from 'vitest'

// DASH-01: Upcoming confirmed sessions view
describe('sessions page — upcoming section', () => {
  it.todo('returns confirmed bookings sorted ascending by booking_date')
  it.todo('returns empty array when teacher has no confirmed bookings')
})

// DASH-03: Earnings display
describe('earnings calculation', () => {
  it.todo('sums amount_cents from completed bookings correctly')
  it.todo('handles null amount_cents (historical rows) — treats as 0')
  it.todo('returns 0 when teacher has no completed bookings')
})

// DASH-04: Student list aggregation
describe('student list grouping', () => {
  it.todo('groups bookings by (student_name, parent_email) correctly')
  it.todo('aggregates subjects across sessions for same student')
  it.todo('counts sessions per student correctly')
})

// DASH-05: markSessionComplete with review token
describe('markSessionComplete — review token', () => {
  it.todo('generates a 64-char hex token and inserts review stub on completion')
  it.todo('writes amount_cents to the booking row at capture time')
  it.todo('calls sendSessionCompleteEmail with bookingId and reviewToken')
})

// REVIEW-01: submitReview server action
describe('submitReview', () => {
  it.todo('writes rating, text, reviewer_name, and sets token_used_at')
  it.todo('idempotent — second call with same reviewId is rejected (token_used_at already set)')
  it.todo('rejects rating outside 1–5 range')
})

// REVIEW-02: Reviews section display logic
describe('reviews section display', () => {
  it.todo('hidden entirely when no reviews exist')
  it.todo('shows aggregate rating header when reviews exist')
  it.todo('shows at most 5 most recent reviews')
})

// REVIEW-03: sendSessionCompleteEmail with real token URL
describe('sendSessionCompleteEmail — review URL', () => {
  it.todo('constructs /review/[token] URL (not /review?booking=id stub)')
})
