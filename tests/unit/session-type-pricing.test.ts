import { describe, it, expect, vi, beforeEach } from 'vitest'

// ──────────────────────────────────────────────
// Mock setup: Supabase server client (auth)
// ──────────────────────────────────────────────
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// ──────────────────────────────────────────────
// Mock setup: Supabase admin (DB queries)
// ──────────────────────────────────────────────
const mockAdminSingle = vi.fn()
const mockAdminEq = vi.fn(() => ({ single: mockAdminSingle }))
const mockAdminSelect = vi.fn(() => ({ eq: mockAdminEq }))
const mockAdminInsertSelect = vi.fn(() => ({ single: mockAdminSingle }))
const mockAdminInsert = vi.fn(() => ({ select: mockAdminInsertSelect }))
const mockAdminDeleteEq = vi.fn()
const mockAdminDelete = vi.fn(() => ({ eq: mockAdminDeleteEq }))
const mockAdminUpsert = vi.fn(() => ({ data: null, error: null }))
const mockAdminMaybeSingle = vi.fn(() => ({ data: null }))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAdminFrom: any = vi.fn((table: string) => {
  if (table === 'bookings') {
    return {
      select: mockAdminSelect,
      insert: mockAdminInsert,
      delete: mockAdminDelete,
    }
  }
  if (table === 'parent_profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockAdminMaybeSingle,
        })),
      })),
      upsert: mockAdminUpsert,
    }
  }
  // teachers, session_types
  return {
    select: mockAdminSelect,
  }
})

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: mockAdminFrom },
}))

// ──────────────────────────────────────────────
// Mock setup: Stripe
// ──────────────────────────────────────────────
const mockPICreate = vi.fn()
const mockCustomersCreate = vi.fn().mockResolvedValue({ id: 'cus_test' })

vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.customers = { create: mockCustomersCreate }
    this.paymentIntents = { create: mockPICreate }
  })
  return { default: StripeMock }
})

// Import handler after mocks
const { POST } = await import(
  '@/app/api/direct-booking/create-intent/route'
)

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const TEACHER_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_TYPE_ID = '22222222-2222-4222-8222-222222222222'
const USER_ID = '33333333-3333-4333-8333-333333333333'
const BOOKING_ID = '44444444-4444-4444-8444-444444444444'
const OTHER_TEACHER_ID = '55555555-5555-4555-8555-555555555555'

function makeRequest(overrides: Record<string, unknown> = {}) {
  const body = {
    teacherId: TEACHER_ID,
    bookingDate: '2025-06-15',
    startTime: '14:00',
    endTime: '15:00',
    studentName: 'Test Student',
    subject: 'Math',
    notes: '',
    ...overrides,
  }
  return new Request('http://localhost/api/direct-booking/create-intent', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const defaultTeacher = {
  id: TEACHER_ID,
  stripe_account_id: 'acct_test123',
  stripe_charges_enabled: true,
  hourly_rate: 60,
}

/** Configure mocks to follow the typical query chain for the route. */
function setupQueryChain(responses: Array<{ table: string; data: unknown; error?: unknown }>) {
  let callIndex = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockAdminFrom.mockImplementation((table: string): any => {
    // parent_profiles is called by the S03 saved-payment-methods flow — always return no existing profile
    if (table === 'parent_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }

    const entry = responses[callIndex]
    callIndex++

    if (table === 'bookings' && entry?.table === 'bookings-insert') {
      // Insert path for bookings
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: entry.data, error: entry.error ?? null }),
          })),
        })),
        delete: vi.fn(() => ({ eq: vi.fn() })),
      }
    }

    if (table === 'bookings' && entry?.table === 'bookings-delete') {
      return {
        delete: vi.fn(() => ({ eq: vi.fn() })),
      }
    }

    // Select path (teachers, session_types)
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: entry?.data ?? null, error: entry?.error ?? null }),
        })),
      })),
    }
  })
}

describe('create-intent pricing fork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'parent@test.com' } },
    })
    // Default: Stripe PI succeeds
    mockPICreate.mockResolvedValue({ client_secret: 'pi_secret_test' })
  })

  // ─────────────────────────────────────
  // 1. Hourly-rate fallback (no sessionTypeId)
  // ─────────────────────────────────────
  it('uses hourly_rate proration when no sessionTypeId is provided', async () => {
    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.clientSecret).toBe('pi_secret_test')

    // 60-min at $60/hr = $60 = 6000 cents
    expect(mockPICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 6000,
        currency: 'usd',
        capture_method: 'manual',
      })
    )

    // Metadata should NOT contain session_type_id
    const piArgs = mockPICreate.mock.calls[0][0]
    expect(piArgs.metadata).not.toHaveProperty('session_type_id')
  })

  // ─────────────────────────────────────
  // 2. Flat price path (sessionTypeId provided)
  // ─────────────────────────────────────
  it('uses session type flat price when sessionTypeId is provided', async () => {
    const sessionType = {
      id: SESSION_TYPE_ID,
      teacher_id: TEACHER_ID,
      label: 'SAT Prep',
      price: '75.00',  // NUMERIC comes back as string from Supabase
    }

    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: sessionType },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID }))
    expect(res.status).toBe(200)

    // $75.00 = 7500 cents (flat price, not prorated)
    expect(mockPICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 7500,
      })
    )

    // Metadata should include session_type_id
    const piArgs = mockPICreate.mock.calls[0][0]
    expect(piArgs.metadata.session_type_id).toBe(SESSION_TYPE_ID)
  })

  // ─────────────────────────────────────
  // 3. Wrong-teacher security rejection
  // ─────────────────────────────────────
  it('rejects session type that belongs to a different teacher', async () => {
    const wrongSessionType = {
      id: SESSION_TYPE_ID,
      teacher_id: OTHER_TEACHER_ID,  // different teacher!
      label: 'Stolen Type',
      price: '100.00',
    }

    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: wrongSessionType },
    ])

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID }))
    expect(res.status).toBe(400)

    const text = await res.text()
    expect(text).toContain('does not belong')
    // Should NOT create PaymentIntent
    expect(mockPICreate).not.toHaveBeenCalled()
  })

  // ─────────────────────────────────────
  // 4. Session type not found
  // ─────────────────────────────────────
  it('returns 400 when session type does not exist', async () => {
    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: null, error: { message: 'not found' } },
    ])

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID }))
    expect(res.status).toBe(400)

    const text = await res.text()
    expect(text).toContain('not found')
    expect(mockPICreate).not.toHaveBeenCalled()
  })

  // ─────────────────────────────────────
  // 5. Correct amount calculation for various prices
  // ─────────────────────────────────────
  it('correctly converts session type price from dollars to cents', async () => {
    const sessionType = {
      id: SESSION_TYPE_ID,
      teacher_id: TEACHER_ID,
      label: 'Homework Help',
      price: '35.50',  // $35.50
    }

    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: sessionType },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID }))
    expect(res.status).toBe(200)

    // $35.50 = 3550 cents
    expect(mockPICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3550,
      })
    )
  })

  // ─────────────────────────────────────
  // 6. Application fee is 7% of session type price
  // ─────────────────────────────────────
  it('applies 7% application fee on session type price', async () => {
    const sessionType = {
      id: SESSION_TYPE_ID,
      teacher_id: TEACHER_ID,
      label: 'SAT Prep',
      price: '100.00',
    }

    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: sessionType },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID }))
    expect(res.status).toBe(200)

    // 7% of 10000 cents = 700 cents
    expect(mockPICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        application_fee_amount: 700,
      })
    )
  })

  // ─────────────────────────────────────
  // 7. Hourly-rate path amount calculation is unchanged
  // ─────────────────────────────────────
  it('computes correct prorated amount for 30-min slot at $60/hr', async () => {
    setupQueryChain([
      { table: 'teachers', data: { ...defaultTeacher, hourly_rate: 60 } },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    const res = await POST(makeRequest({ startTime: '14:00', endTime: '14:30' }))
    expect(res.status).toBe(200)

    // 30 min at $60/hr = $30 = 3000 cents
    expect(mockPICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3000,
      })
    )
  })

  // ─────────────────────────────────────
  // 8. Session type label is used as subject in booking
  // ─────────────────────────────────────
  it('uses session type label as subject in booking row', async () => {
    const sessionType = {
      id: SESSION_TYPE_ID,
      teacher_id: TEACHER_ID,
      label: 'SAT Prep',
      price: '75.00',
    }

    let capturedInsert: Record<string, unknown> | null = null

    setupQueryChain([
      { table: 'teachers', data: defaultTeacher },
      { table: 'session_types', data: sessionType },
      { table: 'bookings-insert', data: { id: BOOKING_ID } },
    ])

    // Override the bookings insert mock to capture the data
    let fromCallIndex = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAdminFrom.mockImplementation((table: string): any => {
      // parent_profiles is called by the S03 saved-payment-methods flow
      if (table === 'parent_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      fromCallIndex++
      if (fromCallIndex === 1) {
        // teachers
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: defaultTeacher, error: null }),
            })),
          })),
        }
      }
      if (fromCallIndex === 2) {
        // session_types
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: sessionType, error: null }),
            })),
          })),
        }
      }
      // bookings insert
      return {
        insert: vi.fn((data: Record<string, unknown>) => {
          capturedInsert = data
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID }, error: null }),
            })),
          }
        }),
        delete: vi.fn(() => ({ eq: vi.fn() })),
      }
    })

    const res = await POST(makeRequest({ sessionTypeId: SESSION_TYPE_ID, subject: 'Math' }))
    expect(res.status).toBe(200)

    // Subject should be the session type label, not the request's subject
    expect(capturedInsert).toBeTruthy()
    expect(capturedInsert!.subject).toBe('SAT Prep')
  })
})
