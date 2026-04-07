import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

// Stripe mock — must use vi.hoisted() class pattern for ESM constructor mocking
const { stripeCreateMock, stripeCustomersCreateMock, MockStripeClass } = vi.hoisted(() => {
  const stripeCreateMock = vi.fn()
  const stripeCustomersCreateMock = vi.fn()
  class MockStripeClass {
    customers = { create: stripeCustomersCreateMock }
    paymentIntents = { create: stripeCreateMock }
  }
  return { stripeCreateMock, stripeCustomersCreateMock, MockStripeClass }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'
const STRIPE_ACCOUNT_ID = 'acct_test123'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/direct-booking/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  teacherId: TEACHER_ID,
  bookingDate: '2026-04-01',
  startTime: '15:00',
  endTime: '16:00',
  studentName: 'Alex Johnson',
  subject: 'Math',
}

function makeTeacherFromMock(overrides: Record<string, unknown> = {}) {
  const fromMock = vi.fn()
  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: TEACHER_ID,
            stripe_account_id: STRIPE_ACCOUNT_ID,
            stripe_charges_enabled: true,
            hourly_rate: 60,
            ...overrides,
          },
          error: null,
        }),
      }),
    }),
  })
  return fromMock
}

function addBookingInsertMock(fromMock: ReturnType<typeof vi.fn>, bookingId = 'booking-uuid-1') {
  fromMock.mockReturnValueOnce({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: bookingId }, error: null }),
      }),
    }),
  })
  // parent_profiles SELECT (no existing profile)
  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
    }),
  })
  // parent_profiles UPSERT (after Customer creation)
  fromMock.mockReturnValueOnce({
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  })
}

describe('direct booking routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module cache for fresh imports in each test
    vi.resetModules()
    // Re-apply mocks
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    // Default Stripe mock response
    stripeCreateMock.mockResolvedValue({ id: 'pi_test', client_secret: 'pi_test_secret' })
    stripeCustomersCreateMock.mockResolvedValue({ id: 'cus_test_new' })
  })

  it('returns 401 when parent is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 when teacher stripe_charges_enabled = false', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'parent@test.com' } }, error: null }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: null, stripe_charges_enabled: false, hourly_rate: 60 },
            error: null,
          }),
        }),
      }),
    } as never)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(400)
  })

  it('stores booking row with status requested before returning clientSecret', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'parent@test.com' } }, error: null }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = makeTeacherFromMock()
    addBookingInsertMock(fromMock, '550e8400-e29b-41d4-a716-446655440099')
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.clientSecret).toBe('pi_test_secret')
    // Verify booking insert was called (second call to supabaseAdmin.from)
    // Now 4 calls: teachers, bookings, parent_profiles select, parent_profiles upsert
    expect(fromMock).toHaveBeenCalledTimes(4)
  })

  it('includes 7% application_fee_amount in PaymentIntent', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'parent@test.com' } }, error: null }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = makeTeacherFromMock({ hourly_rate: 100 })
    addBookingInsertMock(fromMock)
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(makeRequest(validBody))

    // hourly_rate = 100, so amount = 10000 cents, 7% = 700 cents
    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        application_fee_amount: 700,
        amount: 10000,
        capture_method: 'manual',
      })
    )
  })

  it('returns clientSecret for teacher with stripe_charges_enabled = true', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'parent@test.com' } }, error: null }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = makeTeacherFromMock({ hourly_rate: 80 })
    addBookingInsertMock(fromMock)
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    stripeCreateMock.mockResolvedValue({ id: 'pi_test', client_secret: 'pi_valid_secret' })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('clientSecret', 'pi_valid_secret')
  })

  it('sets parent_id on booking row from authenticated user', async () => {
    const USER_ID = 'parent-user-uuid-123'
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID, email: 'parent@test.com' } }, error: null }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'booking-1' }, error: null }),
      }),
    })
    const fromMock = makeTeacherFromMock()
    fromMock.mockReturnValueOnce({ insert: insertMock })
    // parent_profiles SELECT (no existing profile)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // parent_profiles UPSERT
    fromMock.mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(makeRequest(validBody))

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: USER_ID })
    )
  })
})
