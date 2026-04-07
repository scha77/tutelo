import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockSendFollowUpEmail, mockSendUrgentFollowUpEmail } = vi.hoisted(() => {
  const mockSendFollowUpEmail = vi.fn().mockResolvedValue(undefined)
  const mockSendUrgentFollowUpEmail = vi.fn().mockResolvedValue(undefined)
  return { mockSendFollowUpEmail, mockSendUrgentFollowUpEmail }
})

// Mock email module
vi.mock('@/lib/email', () => ({
  sendFollowUpEmail: mockSendFollowUpEmail,
  sendUrgentFollowUpEmail: mockSendUrgentFollowUpEmail,
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabaseAdmin — service role client used in cron handlers
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: mockFrom },
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

const CRON_SECRET = 'test-cron-secret'

function makeRequest(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/cron/stripe-reminders', { headers })
}

/**
 * Creates a booking object with the expected shape from the production query:
 *   .select('id, student_name, parent_email, booking_date, created_at, teacher_id,
 *            teachers(full_name, social_email, stripe_charges_enabled)')
 *
 * The `created_at` value controls which tier the booking falls into:
 *   - <24hr ago  → no email
 *   - 24-48hr ago → gentle reminder (sendFollowUpEmail)
 *   - >48hr ago  → urgent email (sendUrgentFollowUpEmail)
 */
function makeBooking(
  id: string,
  hoursAgo: number,
  teacher: { full_name: string; social_email: string | null; stripe_charges_enabled: boolean }
) {
  return {
    id,
    student_name: 'Test Student',
    parent_email: 'parent@test.com',
    booking_date: '2025-06-15',
    created_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    teacher_id: `teacher-${id}`,
    teachers: teacher,
  }
}

function setupBookingsMock(bookings: ReturnType<typeof makeBooking>[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bookings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({ data: bookings })),
          })),
        })),
      }
    }
    return {}
  })
}

describe('GET /api/cron/stripe-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 when Authorization header is missing or has wrong CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/stripe-reminders/route')

    // Missing header
    const resp1 = await GET(makeRequest())
    expect(resp1.status).toBe(401)

    // Wrong secret
    const resp2 = await GET(makeRequest('wrong-secret'))
    expect(resp2.status).toBe(401)
  })

  it('sends 24hr gentle reminder for 24-48hr old booking where teacher has no Stripe', async () => {
    const teacher = { full_name: 'Jane Doe', social_email: 'jane@school.edu', stripe_charges_enabled: false }
    const booking = makeBooking('b1', 30, teacher) // 30hr = within 24-48hr window

    setupBookingsMock([booking])

    const { GET } = await import('@/app/api/cron/stripe-reminders/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ sent_24hr: 1, sent_48hr: 0 })
    expect(mockSendFollowUpEmail).toHaveBeenCalledWith(
      'jane@school.edu',
      'Jane',            // first name extracted from full_name
      'Test Student',
      'parent@test.com',
      '2025-06-15',
      expect.any(String) // connectUrl
    )
    expect(mockSendUrgentFollowUpEmail).not.toHaveBeenCalled()
  })

  it('sends 48hr urgent email for >48hr old booking where teacher has no Stripe', async () => {
    const teacher = { full_name: 'John Smith', social_email: 'john@school.edu', stripe_charges_enabled: false }
    const booking = makeBooking('b2', 60, teacher) // 60hr = beyond 48hr threshold

    setupBookingsMock([booking])

    const { GET } = await import('@/app/api/cron/stripe-reminders/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ sent_24hr: 0, sent_48hr: 1 })
    expect(mockSendUrgentFollowUpEmail).toHaveBeenCalledWith(
      'john@school.edu',
      'John',            // first name extracted from full_name
      'Test Student',
      'parent@test.com',
      '2025-06-15',
      expect.any(String), // cancelDeadline
      expect.any(String)  // connectUrl
    )
    expect(mockSendFollowUpEmail).not.toHaveBeenCalled()
  })

  it('sends no email when booking is younger than 24hr old (filtered by .lt query)', async () => {
    // Route's .lt(created_at, hr24) means <24hr bookings are excluded at the query level.
    // We simulate this by returning an empty result from the mock.
    setupBookingsMock([])

    const { GET } = await import('@/app/api/cron/stripe-reminders/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ sent_24hr: 0, sent_48hr: 0 })
    expect(mockSendFollowUpEmail).not.toHaveBeenCalled()
    expect(mockSendUrgentFollowUpEmail).not.toHaveBeenCalled()
  })

  it('sends no reminder when teacher already has stripe_charges_enabled = true', async () => {
    const teacher = { full_name: 'Connected Teacher', social_email: 'con@school.edu', stripe_charges_enabled: true }
    const booking = makeBooking('b4', 36, teacher) // In the 24-48hr window but teacher connected

    setupBookingsMock([booking])

    const { GET } = await import('@/app/api/cron/stripe-reminders/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ sent_24hr: 0, sent_48hr: 0 })
    expect(mockSendFollowUpEmail).not.toHaveBeenCalled()
    expect(mockSendUrgentFollowUpEmail).not.toHaveBeenCalled()
  })
})
