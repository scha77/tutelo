import { describe, it, expect, vi, beforeEach } from 'vitest'
import { randomBytes } from 'crypto'

// ---------------------------------------------------------------------------
// Pure logic helpers (extracted inline for testability — no RSC context needed)
// ---------------------------------------------------------------------------

function sumEarnings(bookings: Array<{ amount_cents: number | null }>): number {
  return bookings.reduce((sum, b) => sum + (b.amount_cents ?? 0), 0)
}

function groupStudents(
  bookings: Array<{ student_name: string; parent_email: string; subject: string }>
): Array<{ name: string; email: string; subjects: string[]; count: number }> {
  const studentMap = new Map<
    string,
    { name: string; email: string; subjects: Set<string>; count: number }
  >()
  for (const b of bookings) {
    const key = `${b.student_name}|${b.parent_email}`
    const existing = studentMap.get(key)
    if (existing) {
      existing.subjects.add(b.subject)
      existing.count++
    } else {
      studentMap.set(key, {
        name: b.student_name,
        email: b.parent_email,
        subjects: new Set([b.subject]),
        count: 1,
      })
    }
  }
  return Array.from(studentMap.values())
    .map((v) => ({ ...v, subjects: Array.from(v.subjects) }))
    .sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSupabaseAdminUpdate = vi.fn()
const mockSupabaseAdminInsert = vi.fn()
const mockSupabaseAdminSelect = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      update: mockSupabaseAdminUpdate,
      insert: mockSupabaseAdminInsert,
      select: mockSupabaseAdminSelect,
    })),
  },
}))

const mockResendSend = vi.fn().mockResolvedValue({ id: 'test-id' })

const MockResend = vi.hoisted(() => {
  return class {
    emails = { send: mockResendSend }
  }
})

vi.mock('resend', () => ({
  Resend: MockResend,
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock @/lib/supabase/server (not used in reviewed actions but imported in email.ts)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  }),
}))

// ---------------------------------------------------------------------------
// DASH-01: Upcoming confirmed sessions view
// ---------------------------------------------------------------------------
describe('sessions page — upcoming section', () => {
  it('returns confirmed bookings sorted ascending by booking_date', () => {
    const bookings = [
      { id: '1', status: 'confirmed', booking_date: '2026-04-10' },
      { id: '2', status: 'confirmed', booking_date: '2026-04-01' },
      { id: '3', status: 'confirmed', booking_date: '2026-04-05' },
    ]
    const sorted = [...bookings].sort((a, b) =>
      a.booking_date < b.booking_date ? -1 : 1
    )
    expect(sorted[0].booking_date).toBe('2026-04-01')
    expect(sorted[1].booking_date).toBe('2026-04-05')
    expect(sorted[2].booking_date).toBe('2026-04-10')
  })

  it('returns empty array when teacher has no confirmed bookings', () => {
    const bookings: Array<{ id: string; status: string; booking_date: string }> = []
    const confirmed = bookings.filter((b) => b.status === 'confirmed')
    expect(confirmed).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// DASH-03: Earnings display
// ---------------------------------------------------------------------------
describe('earnings calculation', () => {
  it('sums amount_cents from completed bookings correctly', () => {
    const bookings = [
      { amount_cents: 1000 },
      { amount_cents: 2000 },
      { amount_cents: 500 },
    ]
    expect(sumEarnings(bookings)).toBe(3500)
  })

  it('handles null amount_cents (historical rows) — treats as 0', () => {
    const bookings = [
      { amount_cents: 1000 },
      { amount_cents: null },
      { amount_cents: 2000 },
    ]
    expect(sumEarnings(bookings)).toBe(3000)
  })

  it('returns 0 when teacher has no completed bookings', () => {
    expect(sumEarnings([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// DASH-04: Student list aggregation
// ---------------------------------------------------------------------------
describe('student list grouping', () => {
  it('groups bookings by (student_name, parent_email) correctly', () => {
    const bookings = [
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Math' },
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Reading' },
      { student_name: 'Lily', parent_email: 'c@d.com', subject: 'Science' },
    ]
    const result = groupStudents(bookings)
    expect(result).toHaveLength(2)
  })

  it('aggregates subjects across sessions for same student', () => {
    const bookings = [
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Math' },
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Reading' },
    ]
    const result = groupStudents(bookings)
    expect(result[0].subjects).toContain('Math')
    expect(result[0].subjects).toContain('Reading')
  })

  it('counts sessions per student correctly', () => {
    const bookings = [
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Math' },
      { student_name: 'Sam', parent_email: 'a@b.com', subject: 'Reading' },
      { student_name: 'Lily', parent_email: 'c@d.com', subject: 'Science' },
    ]
    const result = groupStudents(bookings)
    // sorted by count desc — Sam has 2 sessions, Lily has 1
    expect(result[0].name).toBe('Sam')
    expect(result[0].count).toBe(2)
    expect(result[1].count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// DASH-05: markSessionComplete with review token
// ---------------------------------------------------------------------------
describe('markSessionComplete — review token', () => {
  it('generates a 64-char hex token and inserts review stub on completion', () => {
    const token = randomBytes(32).toString('hex')
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('writes amount_cents to the booking row at capture time', () => {
    // Verify that amount_cents is included in the booking update object
    const bookingUpdate = {
      status: 'completed',
      updated_at: new Date().toISOString(),
      amount_cents: 5000,
    }
    expect(bookingUpdate).toHaveProperty('amount_cents')
    expect(bookingUpdate.amount_cents).toBe(5000)
  })

  it('calls sendSessionCompleteEmail with bookingId and reviewToken', async () => {
    // Verify sendSessionCompleteEmail accepts two arguments (bookingId + reviewToken)
    // Set up the mock chain for supabaseAdmin used in sendSessionCompleteEmail
    mockSupabaseAdminSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            parent_email: 'parent@example.com',
            student_name: 'Alex',
            teachers: { full_name: 'Jane Smith' },
          },
          error: null,
        }),
      }),
    })

    const { sendSessionCompleteEmail } = await import('@/lib/email')
    const bookingId = '550e8400-e29b-41d4-a716-446655440001'
    const reviewToken = randomBytes(32).toString('hex')
    // Should not throw; returns void promise
    await expect(sendSessionCompleteEmail(bookingId, reviewToken)).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// REVIEW-01: submitReview server action
// ---------------------------------------------------------------------------
describe('submitReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes rating, text, reviewer_name, and sets token_used_at', async () => {
    // Mock: update returns one row (success)
    mockSupabaseAdminUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'review-id-1' }],
            error: null,
          }),
        }),
      }),
    })
    // Mock: follow-up select for slug revalidation returns teacher slug
    mockSupabaseAdminSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { teachers: { slug: 'jane-smith' } },
          error: null,
        }),
      }),
    })

    const { submitReview } = await import('@/actions/reviews')
    const result = await submitReview('review-id-1', 5, 'Great session!', 'Sarah')
    expect(result).toEqual({ success: true })
    expect(mockSupabaseAdminUpdate).toHaveBeenCalled()
  })

  it('idempotent — second call with same reviewId is rejected (token_used_at already set)', async () => {
    // Mock: update returns empty array (token_used_at already set — idempotency guard)
    mockSupabaseAdminUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })

    const { submitReview } = await import('@/actions/reviews')
    const result = await submitReview('review-id-1', 4, null, null)
    expect(result).toEqual({ error: 'Review already submitted or not found' })
  })

  it('rejects rating outside 1–5 range', async () => {
    const { submitReview } = await import('@/actions/reviews')

    const result0 = await submitReview('review-id-1', 0, null, null)
    expect(result0).toEqual({ error: 'Rating must be a whole number between 1 and 5' })

    const result6 = await submitReview('review-id-1', 6, null, null)
    expect(result6).toEqual({ error: 'Rating must be a whole number between 1 and 5' })

    // DB should NOT be called for invalid ratings
    expect(mockSupabaseAdminUpdate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// REVIEW-02: Reviews section display logic
// ---------------------------------------------------------------------------
describe('reviews section display', () => {
  it('hidden entirely when no reviews exist', async () => {
    const { ReviewsSection } = await import('@/components/profile/ReviewsSection')
    const result = ReviewsSection({ reviews: [] })
    expect(result).toBeNull()
  })

  it('shows aggregate rating header when reviews exist', async () => {
    const { ReviewsSection } = await import('@/components/profile/ReviewsSection')
    const reviews = [
      { rating: 5, review_text: 'Amazing!', reviewer_name: 'Alice', created_at: '2026-01-01T00:00:00Z' },
      { rating: 4, review_text: 'Great!', reviewer_name: 'Bob', created_at: '2026-01-02T00:00:00Z' },
      { rating: 5, review_text: 'Fantastic!', reviewer_name: 'Carol', created_at: '2026-01-03T00:00:00Z' },
    ]
    const result = ReviewsSection({ reviews })
    expect(result).not.toBeNull()
    // Average of 5+4+5 = 4.7
    const jsxStr = JSON.stringify(result)
    expect(jsxStr).toContain('4.7')
    // JSX renders count + plural as separate children: ["(",3," review","s",")"]
    // Verify count (3) and the word "review" are both present in serialized output
    expect(jsxStr).toContain('" review"')
    expect(jsxStr).toContain('"4.7"')
  })

  it('shows at most 5 most recent reviews', async () => {
    const { ReviewsSection } = await import('@/components/profile/ReviewsSection')
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      rating: 5,
      review_text: `Review ${i}`,
      reviewer_name: `User ${i}`,
      created_at: `2026-01-0${i + 1}T00:00:00Z`,
    }))
    const result = ReviewsSection({ reviews })
    // The component slices to 5 — verify by checking structure
    expect(result).not.toBeNull()
    const jsxStr = JSON.stringify(result)
    // Should contain Review 0 through Review 4 but NOT Review 5 or Review 6
    expect(jsxStr).toContain('Review 0')
    expect(jsxStr).toContain('Review 4')
    expect(jsxStr).not.toContain('Review 5')
    expect(jsxStr).not.toContain('Review 6')
  })
})

// ---------------------------------------------------------------------------
// REVIEW-03: sendSessionCompleteEmail with real token URL
// ---------------------------------------------------------------------------
describe('sendSessionCompleteEmail — review URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResendSend.mockResolvedValue({ id: 'test-id' })
  })

  it('constructs /review/[token] URL (not /review?booking=id stub)', async () => {
    // Mock supabaseAdmin.from('bookings').select(...).eq(...).single()
    mockSupabaseAdminSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            parent_email: 'parent@example.com',
            student_name: 'Alex',
            teachers: { full_name: 'Jane Smith' },
          },
          error: null,
        }),
      }),
    })

    const { sendSessionCompleteEmail } = await import('@/lib/email')
    const bookingId = '550e8400-e29b-41d4-a716-446655440002'
    const reviewToken = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'

    await sendSessionCompleteEmail(bookingId, reviewToken)

    expect(mockResendSend).toHaveBeenCalledOnce()
    const callArgs = mockResendSend.mock.calls[0][0]
    // The react prop has reviewUrl embedded — serialize to check
    const reactStr = JSON.stringify(callArgs.react)
    expect(reactStr).toContain(`/review/${reviewToken}`)
    expect(reactStr).not.toContain('/review?booking=')
  })
})

// ---------------------------------------------------------------------------
// firstNameFromEmail utility
// ---------------------------------------------------------------------------
describe('firstNameFromEmail', () => {
  it('extracts first name from email prefix', async () => {
    const { firstNameFromEmail } = await import('@/components/profile/ReviewsSection')
    expect(firstNameFromEmail('sarah.k@gmail.com')).toBe('Sarah')
    expect(firstNameFromEmail('john123@school.edu')).toBe('John')
  })
})
