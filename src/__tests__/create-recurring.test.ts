import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock recurring utilities
vi.mock('@/lib/utils/recurring', () => ({
  generateRecurringDates: vi.fn(),
  checkDateConflicts: vi.fn(),
}))

// Mock email module (imported by the route — Resend constructor throws without API key)
vi.mock('@/lib/email', () => ({
  sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock (vi.hoisted pattern from payment-intent.test.ts)
const { stripeCustomersCreateMock, stripePaymentIntentsCreateMock, MockStripeClass } = vi.hoisted(() => {
  const stripeCustomersCreateMock = vi.fn()
  const stripePaymentIntentsCreateMock = vi.fn()
  class MockStripeClass {
    customers = { create: stripeCustomersCreateMock }
    paymentIntents = { create: stripePaymentIntentsCreateMock }
  }
  return { stripeCustomersCreateMock, stripePaymentIntentsCreateMock, MockStripeClass }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'
const STRIPE_ACCOUNT_ID = 'acct_test_recurring'
const USER_ID = 'user-recurring-1'
const USER_EMAIL = 'parent@example.com'
const SCHEDULE_ID = 'sched-uuid-001'

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    teacherId: TEACHER_ID,
    bookingDate: '2026-04-07',
    startTime: '16:00',
    endTime: '17:00',
    studentName: 'Alex',
    subject: 'Math',
    frequency: 'weekly',
    totalSessions: 6,
    ...overrides,
  }
}

describe('POST /api/direct-booking/create-recurring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-apply mocks after resetModules
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('@/lib/utils/recurring', () => ({
      generateRecurringDates: vi.fn(),
      checkDateConflicts: vi.fn(),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    vi.mock('@/lib/email', () => ({
      sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    }))

    // Default Stripe mocks
    stripeCustomersCreateMock.mockResolvedValue({ id: 'cus_test123' })
    stripePaymentIntentsCreateMock.mockResolvedValue({
      id: 'pi_recurring_test',
      client_secret: 'pi_recurring_test_secret',
    })
  })

  async function setupAuthenticatedUser() {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: USER_EMAIL } },
        }),
      },
    } as never)
  }

  async function setupTeacher(overrides: Record<string, unknown> = {}) {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    return {
      id: TEACHER_ID,
      stripe_account_id: STRIPE_ACCOUNT_ID,
      stripe_charges_enabled: true,
      hourly_rate: 75,
      ...overrides,
    }
  }

  /**
   * Build a from() mock that handles calls for: teachers, recurring_schedules (insert),
   * bookings (insert per date), recurring_schedules (update).
   * 
   * callMap maps table names to their mock return chain. If a table is called
   * multiple times, provide an array of handlers.
   */
  async function setupFromMock(options: {
    teacher?: Record<string, unknown> | null
    teacherError?: boolean
    scheduleInsert?: { id: string } | null
    scheduleInsertError?: unknown
    bookingInserts?: Array<{ data: { id: string } | null; error: unknown }>
    scheduleUpdate?: boolean
  } = {}) {
    const { supabaseAdmin } = await import('@/lib/supabase/service')

    const teacher = options.teacher ?? {
      id: TEACHER_ID,
      stripe_account_id: STRIPE_ACCOUNT_ID,
      stripe_charges_enabled: true,
      hourly_rate: 75,
      full_name: 'Jane Smith',
      social_email: 'jane@example.com',
    }

    const callCounters: Record<string, number> = {}
    const fromMock = vi.fn().mockImplementation((table: string) => {
      callCounters[table] = (callCounters[table] ?? 0) + 1
      const callNum = callCounters[table]

      if (table === 'teachers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: options.teacherError ? null : teacher,
                error: options.teacherError ? { message: 'Not found' } : null,
              }),
            }),
          }),
        }
      }

      if (table === 'recurring_schedules') {
        if (callNum === 1) {
          // Insert
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: options.scheduleInsert ?? { id: SCHEDULE_ID },
                  error: options.scheduleInsertError ?? null,
                }),
              }),
            }),
          }
        }
        // Update or delete
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }

      if (table === 'bookings') {
        const bookingInserts = options.bookingInserts ?? [
          { data: { id: 'booking-1' }, error: null },
          { data: { id: 'booking-2' }, error: null },
          { data: { id: 'booking-3' }, error: null },
          { data: { id: 'booking-4' }, error: null },
          { data: { id: 'booking-5' }, error: null },
        ]
        const bookingIdx = callNum - 1
        const insertResult = bookingInserts[bookingIdx] ?? { data: { id: `booking-auto-${callNum}` }, error: null }

        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(insertResult),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }

      // Default fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)
    return fromMock
  }

  async function setupRecurringMocks(overrides: {
    dates?: string[]
    available?: string[]
    skipped?: { date: string; reason: string }[]
  } = {}) {
    const { generateRecurringDates } = await import('@/lib/utils/recurring')
    const { checkDateConflicts } = await import('@/lib/utils/recurring')

    const dates = overrides.dates ?? [
      '2026-04-07', '2026-04-14', '2026-04-21',
      '2026-04-28', '2026-05-05', '2026-05-12',
    ]
    const available = overrides.available ?? [
      '2026-04-07', '2026-04-14', '2026-04-28',
      '2026-05-05', '2026-05-12',
    ]
    const skipped = overrides.skipped ?? [
      { date: '2026-04-21', reason: 'already booked' },
    ]

    vi.mocked(generateRecurringDates).mockReturnValue(dates)
    vi.mocked(checkDateConflicts).mockResolvedValue({ available, skipped })
  }

  async function makeNextRequest(bodyOverrides: Record<string, unknown> = {}) {
    const { NextRequest } = await import('next/server')
    return new NextRequest('http://localhost/api/direct-booking/create-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeRequest(bodyOverrides)),
    })
  }

  // ─── Test cases ─────────────────────────────────────────────────

  it('happy path: 6 weekly sessions, 1 skipped → returns clientSecret + 5 sessionDates + 1 skippedDate', async () => {
    await setupAuthenticatedUser()
    await setupFromMock()
    await setupRecurringMocks()

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('clientSecret', 'pi_recurring_test_secret')
    expect(json).toHaveProperty('recurringScheduleId', SCHEDULE_ID)
    expect(json.sessionDates).toHaveLength(5)
    expect(json.skippedDates).toHaveLength(1)
    expect(json.skippedDates[0]).toEqual({ date: '2026-04-21', reason: 'already booked' })
    expect(json.totalCreated).toBe(5)
  })

  it('creates Stripe Customer with user email and metadata', async () => {
    await setupAuthenticatedUser()
    await setupFromMock()
    await setupRecurringMocks()

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    await POST(req)

    expect(stripeCustomersCreateMock).toHaveBeenCalledWith({
      email: USER_EMAIL,
      metadata: { tutelo_user_id: USER_ID },
    })
  })

  it('creates PaymentIntent with setup_future_usage and manual capture', async () => {
    await setupAuthenticatedUser()
    await setupFromMock()
    await setupRecurringMocks()

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    await POST(req)

    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        capture_method: 'manual',
        setup_future_usage: 'off_session',
        customer: 'cus_test123',
        transfer_data: { destination: STRIPE_ACCOUNT_ID },
        currency: 'usd',
        metadata: expect.objectContaining({
          booking_id: 'booking-1',
          teacher_id: TEACHER_ID,
          recurring_schedule_id: SCHEDULE_ID,
        }),
      })
    )
  })

  it('unauthenticated → 401', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('teacher not Stripe-connected → 400', async () => {
    await setupAuthenticatedUser()
    await setupFromMock({
      teacher: {
        id: TEACHER_ID,
        stripe_account_id: null,
        stripe_charges_enabled: false,
        hourly_rate: 75,
      },
    })

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('not connected')
  })

  it('zero available dates → 409', async () => {
    await setupAuthenticatedUser()
    await setupFromMock()
    await setupRecurringMocks({
      available: [],
      skipped: [
        { date: '2026-04-07', reason: 'already booked' },
        { date: '2026-04-14', reason: 'already booked' },
      ],
    })

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain('No available dates')
  })

  it('invalid body (missing frequency) → 400', async () => {
    await setupAuthenticatedUser()

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-07',
        startTime: '16:00',
        endTime: '17:00',
        studentName: 'Alex',
        subject: 'Math',
        totalSessions: 6,
        // frequency intentionally omitted
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })

  it('Stripe failure → 502 + cleanup (deletes bookings and schedule)', async () => {
    await setupAuthenticatedUser()
    const fromMock = await setupFromMock()
    await setupRecurringMocks()

    stripeCustomersCreateMock.mockRejectedValue(new Error('Stripe connection error'))

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(req)

    expect(res.status).toBe(502)
    const text = await res.text()
    expect(text).toContain('Payment setup failed')

    // Verify cleanup was called — bookings delete + schedule delete
    // The from mock should have been called with 'bookings' (for deletes) and 'recurring_schedules' (for delete)
    const fromCalls = fromMock.mock.calls.map((c: unknown[]) => c[0])
    expect(fromCalls).toContain('bookings')
    // recurring_schedules called at least twice (insert + delete for cleanup)
    const scheduleCalls = fromCalls.filter((t: unknown) => t === 'recurring_schedules')
    expect(scheduleCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('computes correct amount using hourly rate proration', async () => {
    await setupAuthenticatedUser()
    await setupFromMock()
    await setupRecurringMocks()

    const req = await makeNextRequest()
    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    await POST(req)

    // 1 hour at $75/hr = 7500 cents, 7% fee = 525
    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 7500,
        application_fee_amount: 525,
      })
    )
  })
})
