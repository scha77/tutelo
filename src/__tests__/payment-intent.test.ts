import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests verify the PaymentIntent API route behavior (also covers payment-intent behaviors from plan)
// PaymentStep component tests use RTL — see below

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

// Stripe mock
const { stripeCreateMock, MockStripeClass } = vi.hoisted(() => {
  const stripeCreateMock = vi.fn()
  class MockStripeClass {
    paymentIntents = { create: stripeCreateMock }
  }
  return { stripeCreateMock, MockStripeClass }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'
const STRIPE_ACCOUNT_ID = 'acct_test123'

describe('PaymentIntent creation (create-intent API route)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    stripeCreateMock.mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'pi_test123_secret',
    })
  })

  it('creates PaymentIntent with capture_method manual', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'p@test.com' } } }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: STRIPE_ACCOUNT_ID, stripe_charges_enabled: true, hourly_rate: 75 },
          }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'booking-1' } }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(req)

    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ capture_method: 'manual' })
    )
  })

  it('uses destination charge: transfer_data.destination = teacher stripe_account_id', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'p@test.com' } } }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: STRIPE_ACCOUNT_ID, stripe_charges_enabled: true, hourly_rate: 75 },
          }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'booking-1' } }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(req)

    // Implementation uses destination charges without on_behalf_of (platform-side PaymentIntent)
    // See fix(04-02): switch to destination charges without on_behalf_of
    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transfer_data: { destination: STRIPE_ACCOUNT_ID },
      })
    )
  })

  it('sets receipt_email from authenticated user email', async () => {
    const PARENT_EMAIL = 'parenttest@example.com'
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: PARENT_EMAIL } } }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: STRIPE_ACCOUNT_ID, stripe_charges_enabled: true, hourly_rate: 75 },
          }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'booking-1' } }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(req)

    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ receipt_email: PARENT_EMAIL })
    )
  })

  it('encodes booking metadata (teacher_id, booking_id)', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'p@test.com' } } }) },
    } as never)

    const BOOKING_ID = 'booking-uuid-xyz'
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: STRIPE_ACCOUNT_ID, stripe_charges_enabled: true, hourly_rate: 75 },
          }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID } }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(req)

    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          booking_id: BOOKING_ID,
          teacher_id: TEACHER_ID,
        }),
      })
    )
  })

  it('returns clientSecret to client', async () => {
    stripeCreateMock.mockResolvedValue({ id: 'pi_ret', client_secret: 'pi_ret_secret_xyz' })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'p@test.com' } } }) },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, stripe_account_id: STRIPE_ACCOUNT_ID, stripe_charges_enabled: true, hourly_rate: 75 },
          }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'booking-1' } }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(req)
    const json = await res.json()
    expect(json).toHaveProperty('clientSecret', 'pi_ret_secret_xyz')
  })
})
