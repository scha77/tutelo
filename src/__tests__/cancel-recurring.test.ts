import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: mockAdminFrom },
}))

// Mock email module
vi.mock('@/lib/email', () => ({
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendRecurringCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock SMS module
vi.mock('@/lib/sms', () => ({
  sendSmsCancellation: vi.fn().mockResolvedValue(undefined),
}))

// Mock waitlist notification module
vi.mock('@/lib/utils/waitlist', () => ({
  checkAndNotifyWaitlist: vi.fn().mockResolvedValue(undefined),
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
const SCHEDULE_ID = 'schedule-uuid-001'
const PI_ID = 'pi_test_cancel'

/**
 * Helper: build a mock supabase client for auth + teacher lookup
 */
function buildMockClient(options: {
  userId?: string | null
  teacher?: { id: string } | null
  teacherError?: boolean
}) {
  const teacherSingle = vi.fn().mockResolvedValue({
    data: options.teacher ?? null,
    error: options.teacherError ? { message: 'not found' } : null,
  })
  const teacherEq = vi.fn().mockReturnValue({ single: teacherSingle })
  const teacherSelect = vi.fn().mockReturnValue({ eq: teacherEq })

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'teachers') return { select: teacherSelect }
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
  }
}

describe('cancelSingleRecurringSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: mockAdminFrom } }))
    vi.mock('@/lib/email', () => ({
      sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
      sendRecurringCancellationEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('@/lib/sms', () => ({ sendSmsCancellation: vi.fn().mockResolvedValue(undefined) }))
    vi.mock('@/lib/utils/waitlist', () => ({ checkAndNotifyWaitlist: vi.fn().mockResolvedValue(undefined) }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    stripeCancelMock.mockResolvedValue({ id: PI_ID, status: 'canceled' })
  })

  function setupAdminBookingLookup(booking: { id: string; stripe_payment_intent: string | null; status: string } | null) {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: booking })
    const inMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqTeacher = vi.fn().mockReturnValue({ in: inMock })
    const eqId = vi.fn().mockReturnValue({ eq: eqTeacher })
    const selectMock = vi.fn().mockReturnValue({ eq: eqId })

    const updateEqId = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqId })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'bookings') return { select: selectMock, update: updateMock }
      return {}
    })

    return { updateMock, updateEqId }
  }

  it('returns error when not authenticated', async () => {
    const { client } = buildMockClient({ userId: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when teacher not found', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: null, teacherError: true })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)
    expect(result).toEqual({ error: 'Teacher not found' })
  })

  it('returns error when booking not found or not in cancellable state', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    setupAdminBookingLookup(null)

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)
    expect(result).toEqual({ error: 'Booking not found or not in cancellable state' })
  })

  it.each(['confirmed', 'requested', 'payment_failed'])('handles %s status booking with PI', async (status) => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    const { updateMock } = setupAdminBookingLookup({ id: BOOKING_ID, stripe_payment_intent: PI_ID, status })

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)

    expect(result).toEqual({ success: true })
    expect(stripeCancelMock).toHaveBeenCalledWith(PI_ID)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))

    const { sendCancellationEmail } = await import('@/lib/email')
    expect(sendCancellationEmail).toHaveBeenCalledWith(BOOKING_ID)
  })

  it('skips Stripe void when no PI present', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    const { updateMock } = setupAdminBookingLookup({ id: BOOKING_ID, stripe_payment_intent: null, status: 'confirmed' })

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)

    expect(result).toEqual({ success: true })
    expect(stripeCancelMock).not.toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
  })

  it('is resilient to Stripe errors — still updates DB and sends email', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stripeCancelMock.mockRejectedValue(new Error('Stripe network error'))

    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    const { updateMock } = setupAdminBookingLookup({ id: BOOKING_ID, stripe_payment_intent: PI_ID, status: 'confirmed' })

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    const result = await cancelSingleRecurringSession(BOOKING_ID)

    expect(result).toEqual({ success: true })
    expect(stripeCancelMock).toHaveBeenCalledWith(PI_ID)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))

    const { sendCancellationEmail } = await import('@/lib/email')
    expect(sendCancellationEmail).toHaveBeenCalledWith(BOOKING_ID)

    errorSpy.mockRestore()
  })

  it('calls revalidatePath for sessions and dashboard', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    setupAdminBookingLookup({ id: BOOKING_ID, stripe_payment_intent: PI_ID, status: 'confirmed' })

    const { cancelSingleRecurringSession } = await import('@/actions/bookings')
    await cancelSingleRecurringSession(BOOKING_ID)

    const { revalidatePath } = await import('next/cache')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/sessions')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout')
  })
})

describe('cancelRecurringSeries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: mockAdminFrom } }))
    vi.mock('@/lib/email', () => ({
      sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
      sendRecurringCancellationEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('@/lib/sms', () => ({ sendSmsCancellation: vi.fn().mockResolvedValue(undefined) }))
    vi.mock('@/lib/utils/waitlist', () => ({ checkAndNotifyWaitlist: vi.fn().mockResolvedValue(undefined) }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    stripeCancelMock.mockResolvedValue({ id: PI_ID, status: 'canceled' })
  })

  function setupAdminMocks(options: {
    schedule?: { id: string; teacher_id: string } | null
    futureBookings?: Array<{ id: string; stripe_payment_intent: string | null }>
  }) {
    const scheduleMaybeSingle = vi.fn().mockResolvedValue({ data: options.schedule ?? null })
    const scheduleEqTeacher = vi.fn().mockReturnValue({ maybeSingle: scheduleMaybeSingle })
    const scheduleEqId = vi.fn().mockReturnValue({ eq: scheduleEqTeacher })
    const scheduleSelect = vi.fn().mockReturnValue({ eq: scheduleEqId })

    const bookingsIn = vi.fn().mockResolvedValue({ data: options.futureBookings ?? [] })
    const bookingsGte = vi.fn().mockReturnValue({ in: bookingsIn })
    const bookingsEqSchedule = vi.fn().mockReturnValue({ gte: bookingsGte })
    const bookingsSelect = vi.fn().mockReturnValue({ eq: bookingsEqSchedule })

    const updateInIds = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ in: updateInIds })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'recurring_schedules') return { select: scheduleSelect }
      if (table === 'bookings') return { select: bookingsSelect, update: updateMock }
      return {}
    })

    return { updateMock, updateInIds }
  }

  it('returns error when not authenticated', async () => {
    const { client } = buildMockClient({ userId: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when teacher not found', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: null, teacherError: true })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)
    expect(result).toEqual({ error: 'Teacher not found' })
  })

  it('returns error when schedule not found or not owned by teacher', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    setupAdminMocks({ schedule: null })

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)
    expect(result).toEqual({ error: 'Schedule not found or not owned by teacher' })
  })

  it('returns success with no-op when no future bookings exist', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    setupAdminMocks({
      schedule: { id: SCHEDULE_ID, teacher_id: TEACHER_ID },
      futureBookings: [],
    })

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)
    expect(result).toEqual({ success: true })
    expect(stripeCancelMock).not.toHaveBeenCalled()
  })

  it('cancels all future bookings, voids PIs, sends series email', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const futureBookings = [
      { id: 'b1', stripe_payment_intent: 'pi_1' },
      { id: 'b2', stripe_payment_intent: null },
      { id: 'b3', stripe_payment_intent: 'pi_3' },
    ]
    const { updateMock } = setupAdminMocks({
      schedule: { id: SCHEDULE_ID, teacher_id: TEACHER_ID },
      futureBookings,
    })

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)

    expect(result).toEqual({ success: true })

    // Stripe called for PI bookings only
    expect(stripeCancelMock).toHaveBeenCalledTimes(2)
    expect(stripeCancelMock).toHaveBeenCalledWith('pi_1')
    expect(stripeCancelMock).toHaveBeenCalledWith('pi_3')

    // Batch update called
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))

    // Series email sent
    const { sendRecurringCancellationEmail } = await import('@/lib/email')
    expect(sendRecurringCancellationEmail).toHaveBeenCalledWith({ scheduleId: SCHEDULE_ID })
  })

  it('is resilient to Stripe errors — still updates DB and sends email', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stripeCancelMock.mockRejectedValue(new Error('Stripe down'))

    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)

    const { updateMock } = setupAdminMocks({
      schedule: { id: SCHEDULE_ID, teacher_id: TEACHER_ID },
      futureBookings: [{ id: 'b1', stripe_payment_intent: 'pi_1' }],
    })

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    const result = await cancelRecurringSeries(SCHEDULE_ID)

    expect(result).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))

    const { sendRecurringCancellationEmail } = await import('@/lib/email')
    expect(sendRecurringCancellationEmail).toHaveBeenCalledWith({ scheduleId: SCHEDULE_ID })

    errorSpy.mockRestore()
  })

  it('calls revalidatePath for sessions and dashboard', async () => {
    const { client } = buildMockClient({ userId: 'user-1', teacher: { id: TEACHER_ID } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as never)
    setupAdminMocks({
      schedule: { id: SCHEDULE_ID, teacher_id: TEACHER_ID },
      futureBookings: [{ id: 'b1', stripe_payment_intent: null }],
    })

    const { cancelRecurringSeries } = await import('@/actions/bookings')
    await cancelRecurringSeries(SCHEDULE_ID)

    const { revalidatePath } = await import('next/cache')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/sessions')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout')
  })
})
