import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const updateEqMock = vi.fn().mockResolvedValue({ error: null })
const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendBookingEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock for create-intent route
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

// ── Helpers ────────────────────────────────────────────────────────────────

const BOOKING_ID = 'test-booking-uuid'
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeBaseFormData(overrides: Record<string, unknown> = {}) {
  return {
    teacherId: TEACHER_ID,
    studentName: 'Alex',
    subject: 'Math',
    email: 'parent@example.com',
    bookingDate: '2026-04-01',
    startTime: '15:00',
    endTime: '16:00',
    ...overrides,
  }
}

// ── Deferred path tests (submitBookingRequest) ─────────────────────────────

describe('submitBookingRequest — phone storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-register mocks after resetModules
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))
    vi.mock('@/lib/email', () => ({ sendBookingEmail: vi.fn().mockResolvedValue(undefined) }))
  })

  async function setupDeferredMocks() {
    const { createClient } = await import('@/lib/supabase/server')
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: true, booking_id: BOOKING_ID },
      error: null,
    })
    // Chain for supabase.from('teachers').select('slug').eq('id', ...).single()
    const slugSingleMock = vi.fn().mockResolvedValue({ data: { slug: 'test-teacher' } })
    const slugEqMock = vi.fn().mockReturnValue({ single: slugSingleMock })
    const slugSelectMock = vi.fn().mockReturnValue({ eq: slugEqMock })
    const ssrFromMock = vi.fn().mockReturnValue({ select: slugSelectMock })
    vi.mocked(createClient).mockResolvedValue({
      rpc: rpcMock,
      from: ssrFromMock,
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const localUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const localUpdate = vi.fn().mockReturnValue({ eq: localUpdateEq })
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      update: localUpdate,
    } as never)

    return { supabaseAdmin, localUpdate, localUpdateEq }
  }

  it('stores parent phone when provided', async () => {
    const { supabaseAdmin, localUpdate, localUpdateEq } = await setupDeferredMocks()
    const { submitBookingRequest } = await import('@/actions/bookings')

    const result = await submitBookingRequest(
      makeBaseFormData({ parent_phone: '(555) 123-4567', parent_sms_opt_in: true })
    )

    expect(result).toEqual({ success: true, bookingId: BOOKING_ID })
    expect(supabaseAdmin.from).toHaveBeenCalledWith('bookings')
    expect(localUpdate).toHaveBeenCalledWith({
      parent_phone: '(555) 123-4567',
      parent_sms_opt_in: true,
    })
    expect(localUpdateEq).toHaveBeenCalledWith('id', BOOKING_ID)
  })

  it('skips phone UPDATE when parent_phone is absent', async () => {
    const { supabaseAdmin } = await setupDeferredMocks()
    const { submitBookingRequest } = await import('@/actions/bookings')

    const result = await submitBookingRequest(makeBaseFormData())

    expect(result).toEqual({ success: true, bookingId: BOOKING_ID })
    // supabaseAdmin.from should NOT be called for update (it may be called for other things)
    // Check that .from was not called at all since the only admin usage is phone update
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('skips phone UPDATE when parent_phone is empty string', async () => {
    const { supabaseAdmin } = await setupDeferredMocks()
    const { submitBookingRequest } = await import('@/actions/bookings')

    const result = await submitBookingRequest(makeBaseFormData({ parent_phone: '' }))

    expect(result).toEqual({ success: true, bookingId: BOOKING_ID })
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('returns success even when phone UPDATE fails', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: true, booking_id: BOOKING_ID },
      error: null,
    })
    // Chain for supabase.from('teachers').select('slug').eq('id', ...).single()
    const slugSingleMock = vi.fn().mockResolvedValue({ data: { slug: 'test-teacher' } })
    const slugEqMock = vi.fn().mockReturnValue({ single: slugSingleMock })
    const slugSelectMock = vi.fn().mockReturnValue({ eq: slugEqMock })
    const ssrFromMock = vi.fn().mockReturnValue({ select: slugSelectMock })
    vi.mocked(createClient).mockResolvedValue({
      rpc: rpcMock,
      from: ssrFromMock,
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    } as never)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { submitBookingRequest } = await import('@/actions/bookings')

    const result = await submitBookingRequest(
      makeBaseFormData({ parent_phone: '(555) 999-0000', parent_sms_opt_in: false })
    )

    expect(result).toEqual({ success: true, bookingId: BOOKING_ID })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[submitBookingRequest] Failed to store parent phone'),
      BOOKING_ID,
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })
})

// ── Direct path tests (create-intent route) ─────────────────────────────────

describe('create-intent route — phone fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))

    stripeCreateMock.mockResolvedValue({
      id: 'pi_test',
      client_secret: 'pi_test_secret',
    })
    stripeCustomersCreateMock.mockResolvedValue({ id: 'cus_test_new' })
  })

  async function setupDirectMocks() {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'parent@test.com' } },
        }),
      },
    } as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const insertMock = vi.fn()
    const fromMock = vi.fn()

    // First call: teacher lookup
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: TEACHER_ID,
              stripe_account_id: 'acct_test',
              stripe_charges_enabled: true,
              hourly_rate: 75,
            },
          }),
        }),
      }),
    })

    // Second call: booking insert
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID } }),
      }),
    })
    fromMock.mockReturnValueOnce({ insert: insertMock })

    // Third call: parent_profiles SELECT (no existing profile)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Fourth call: parent_profiles UPSERT
    fromMock.mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    return { insertMock }
  }

  it('includes phone fields in booking INSERT when provided', async () => {
    const { insertMock } = await setupDirectMocks()

    const req = new Request('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-01',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
        parentPhone: '(555) 222-3333',
        parentSmsOptIn: true,
      }),
    })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(req)

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_phone: '(555) 222-3333',
        parent_sms_opt_in: true,
      })
    )
  })

  it('defaults phone to null and opt-in to false when absent', async () => {
    const { insertMock } = await setupDirectMocks()

    const req = new Request('http://localhost/api/direct-booking/create-intent', {
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

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_phone: null,
        parent_sms_opt_in: false,
      })
    )
  })
})
