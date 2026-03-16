import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin (used by email module)
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

// Mock email module
vi.mock('@/lib/email', () => ({
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock — class-based vi.hoisted pattern for ESM constructor mocking
const { MockStripeClass, stripeCancelMock } = vi.hoisted(() => {
  const stripeCancelMock = vi.fn()
  class MockStripeClass {
    paymentIntents = { cancel: stripeCancelMock }
  }
  return { MockStripeClass, stripeCancelMock }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

const TEACHER_ID = 'teacher-uuid-001'
const BOOKING_ID = 'booking-uuid-001'
const PI_ID = 'pi_test_cancel'

/**
 * Helper: build a mock supabase client with configurable getClaims, teacher lookup, and booking lookup.
 */
function buildMockClient(options: {
  userId?: string | null
  teacher?: { id: string } | null
  teacherError?: boolean
  booking?: { id: string; stripe_payment_intent: string | null } | null
}) {
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: options.booking ?? null })
  const bookingEqStatus = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const bookingEqTeacher = vi.fn().mockReturnValue({ eq: bookingEqStatus })
  const bookingEqId = vi.fn().mockReturnValue({ eq: bookingEqTeacher })
  const bookingSelect = vi.fn().mockReturnValue({ eq: bookingEqId })

  const updateEqId = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqId })

  const teacherSingle = vi.fn().mockResolvedValue({
    data: options.teacher ?? null,
    error: options.teacherError ? { message: 'not found' } : null,
  })
  const teacherEq = vi.fn().mockReturnValue({ single: teacherSingle })
  const teacherSelect = vi.fn().mockReturnValue({ eq: teacherEq })

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'teachers') return { select: teacherSelect }
    if (table === 'bookings') return { select: bookingSelect, update: updateMock }
    return {}
  })

  return {
    client: {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: options.userId ? { claims: { sub: options.userId } } : { claims: {} },
        }),
      },
      from: fromMock,
    },
    mocks: { fromMock, updateMock, updateEqId, maybeSingleMock },
  }
}

describe('cancelSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Re-apply mocks after resetModules
    vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('@/lib/email', () => ({ sendCancellationEmail: vi.fn().mockResolvedValue(undefined) }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    stripeCancelMock.mockResolvedValue({ id: PI_ID, status: 'canceled' })
  })

  it('returns error when getClaims() has no sub (not authenticated)', async () => {
    const { client } = buildMockClient({ userId: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when teacher row not found', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: null, teacherError: true })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ error: 'Teacher not found' })
  })

  it('returns error when booking not found (wrong teacher or not confirmed)', async () => {
    const { client } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: null, // no matching booking
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ error: 'Booking not found or not in confirmed state' })
  })

  it('cancels Stripe PI + updates DB + sends email on happy path', async () => {
    const { client, mocks } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: { id: BOOKING_ID, stripe_payment_intent: PI_ID },
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ success: true })

    // Stripe PI cancel called
    expect(stripeCancelMock).toHaveBeenCalledWith(PI_ID)

    // DB update called with cancelled status
    expect(mocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )

    // Email sent
    const { sendCancellationEmail } = await import('@/lib/email')
    expect(sendCancellationEmail).toHaveBeenCalledWith(BOOKING_ID)
  })

  it('skips Stripe call when stripe_payment_intent is null, still updates DB + sends email', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client, mocks } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: { id: BOOKING_ID, stripe_payment_intent: null },
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ success: true })

    // Stripe NOT called
    expect(stripeCancelMock).not.toHaveBeenCalled()

    // console.warn logged for missing PI
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no stripe_payment_intent')
    )

    // DB update still called
    expect(mocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )

    // Email still sent
    const { sendCancellationEmail } = await import('@/lib/email')
    expect(sendCancellationEmail).toHaveBeenCalledWith(BOOKING_ID)

    warnSpy.mockRestore()
  })

  it('still updates DB and sends email even when Stripe PI cancel throws (resilience)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stripeCancelMock.mockRejectedValue(new Error('Stripe network error'))

    const { client, mocks } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: { id: BOOKING_ID, stripe_payment_intent: PI_ID },
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    expect(result).toEqual({ success: true })

    // Stripe was attempted
    expect(stripeCancelMock).toHaveBeenCalledWith(PI_ID)

    // Error was logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to cancel Stripe PI ${PI_ID}`),
      expect.any(Error)
    )

    // DB update still proceeded
    expect(mocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )

    // Email still sent
    const { sendCancellationEmail } = await import('@/lib/email')
    expect(sendCancellationEmail).toHaveBeenCalledWith(BOOKING_ID)

    errorSpy.mockRestore()
  })

  it('calls revalidatePath for /dashboard/sessions and /dashboard layout', async () => {
    const { client } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: { id: BOOKING_ID, stripe_payment_intent: PI_ID },
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSession } = await import('@/actions/bookings')
    await cancelSession(BOOKING_ID)

    const { revalidatePath } = await import('next/cache')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/sessions')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('email is fire-and-forget (catch errors silently)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = buildMockClient({
      userId: 'user-1',
      teacher: { id: TEACHER_ID },
      booking: { id: BOOKING_ID, stripe_payment_intent: PI_ID },
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    // Make email throw
    const { sendCancellationEmail } = await import('@/lib/email')
    vi.mocked(sendCancellationEmail).mockRejectedValue(new Error('Email service down'))

    const { cancelSession } = await import('@/actions/bookings')
    const result = await cancelSession(BOOKING_ID)

    // Action still succeeds despite email failure
    expect(result).toEqual({ success: true })

    // Wait for the rejected promise's .catch to fire
    await new Promise((r) => setTimeout(r, 10))

    // The .catch(console.error) on the fire-and-forget handles it
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })
})
