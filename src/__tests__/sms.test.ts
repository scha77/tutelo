import { describe, it, expect, vi, beforeEach } from 'vitest'

// Twilio function mock — vi.hoisted() pattern for ESM module-level call
const { mockTwilioFn, messagesCreateMock } = vi.hoisted(() => {
  const messagesCreateMock = vi.fn().mockResolvedValue({ sid: 'SM_test_123' })
  const mockTwilioFn = vi.fn().mockReturnValue({
    messages: { create: messagesCreateMock },
  })
  return { mockTwilioFn, messagesCreateMock }
})

vi.mock('twilio', () => ({
  default: mockTwilioFn,
}))

// Supabase admin mock
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Helper: chainable supabase mock
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'single', 'maybeSingle']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve(finalValue).then(resolve)
  return chain
}

const BOOKING_ID = 'booking-uuid-001'

function makeBookingData(overrides: Record<string, unknown> = {}) {
  return {
    student_name: 'Alex',
    subject: 'Math',
    booking_date: '2026-03-15',
    start_time: '15:30:00',
    parent_phone: '+12125551234',
    parent_sms_opt_in: true,
    teachers: {
      full_name: 'Sarah Johnson',
      phone_number: '+15125559876',
      sms_opt_in: true,
    },
    ...overrides,
  }
}

describe('sendSmsReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'auth_test'
    process.env.TWILIO_PHONE_NUMBER = '+15005550006'
  })

  it('sends SMS to both teacher and parent when both opted in', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(makeChain({ data: makeBookingData() }) as never)

    const { sendSmsReminder } = await import('@/lib/sms')
    await sendSmsReminder(BOOKING_ID)

    expect(messagesCreateMock).toHaveBeenCalledTimes(2)

    // Teacher SMS
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15125559876',
        body: expect.stringContaining('session with Alex'),
      })
    )

    // Parent SMS
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+12125551234',
        body: expect.stringContaining("Alex's session with Sarah Johnson"),
      })
    )
  })

  it('skips teacher SMS when phone_number is null', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(
      makeChain({
        data: makeBookingData({
          teachers: { full_name: 'Sarah Johnson', phone_number: null, sms_opt_in: true },
        }),
      }) as never
    )

    const { sendSmsReminder } = await import('@/lib/sms')
    await sendSmsReminder(BOOKING_ID)

    // Only parent SMS sent (teacher skipped)
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+12125551234' })
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Teacher not opted in')
    )
    warnSpy.mockRestore()
  })

  it('skips teacher SMS when sms_opt_in is false', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(
      makeChain({
        data: makeBookingData({
          teachers: { full_name: 'Sarah Johnson', phone_number: '+15125559876', sms_opt_in: false },
        }),
      }) as never
    )

    const { sendSmsReminder } = await import('@/lib/sms')
    await sendSmsReminder(BOOKING_ID)

    // Only parent SMS sent
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Teacher not opted in')
    )
    warnSpy.mockRestore()
  })

  it('skips parent SMS when parent_sms_opt_in is false', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(
      makeChain({
        data: makeBookingData({ parent_sms_opt_in: false }),
      }) as never
    )

    const { sendSmsReminder } = await import('@/lib/sms')
    await sendSmsReminder(BOOKING_ID)

    // Only teacher SMS sent (parent skipped)
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+15125559876' })
    )
  })

  it('skips all SMS when booking not found', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(makeChain({ data: null }) as never)

    const { sendSmsReminder } = await import('@/lib/sms')
    await sendSmsReminder(BOOKING_ID)

    expect(messagesCreateMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not found')
    )
    warnSpy.mockRestore()
  })
})

describe('sendSmsCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'auth_test'
    process.env.TWILIO_PHONE_NUMBER = '+15005550006'
  })

  it('sends cancellation SMS to parent when opted in', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(makeChain({ data: makeBookingData() }) as never)

    const { sendSmsCancellation } = await import('@/lib/sms')
    await sendSmsCancellation(BOOKING_ID)

    // Both parent and teacher receive cancellation
    expect(messagesCreateMock).toHaveBeenCalledTimes(2)
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+12125551234',
        body: expect.stringContaining('has been cancelled'),
      })
    )
  })

  it('skips parent cancellation SMS when parent_sms_opt_in is false', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(
      makeChain({
        data: makeBookingData({ parent_sms_opt_in: false }),
      }) as never
    )

    const { sendSmsCancellation } = await import('@/lib/sms')
    await sendSmsCancellation(BOOKING_ID)

    // Only teacher gets SMS
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+15125559876' })
    )
  })

  it('handles Twilio error gracefully (does not throw)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    messagesCreateMock.mockRejectedValue(new Error('Twilio network error'))

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)
    fromSpy.mockReturnValueOnce(makeChain({ data: makeBookingData() }) as never)

    const { sendSmsCancellation } = await import('@/lib/sms')

    // Should not throw
    await expect(sendSmsCancellation(BOOKING_ID)).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[sms] Failed to send SMS'),
      expect.any(Error)
    )
    errorSpy.mockRestore()
  })
})
