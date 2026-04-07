import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock email module
vi.mock('@/lib/email', () => ({
  sendCheckoutLinkEmail: vi.fn(),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock — class pattern for ESM
const { MockStripeClass, constructEventMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn()
  class MockStripeClass {
    webhooks = { constructEvent: constructEventMock }
    checkout = {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' }),
      },
    }
  }
  return { MockStripeClass, constructEventMock }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

function makeWebhookRequest(body: string, sig = 'sig_valid') {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  })
}

describe('payment_intent.amount_capturable_updated webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('@/lib/email', () => ({
      sendCheckoutLinkEmail: vi.fn(),
      sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
  })

  it('verifies Stripe webhook signature before processing', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify({ type: 'payment_intent.amount_capturable_updated' }), 'bad_sig')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('skips processing if booking_id missing from PaymentIntent metadata', async () => {
    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: { object: { id: 'pi_test', metadata: {} } },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    const res = await POST(req)
    expect(res.status).toBe(200)
    // Should not call supabaseAdmin.from for bookings update
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('updates booking status to confirmed on payment_intent.amount_capturable_updated', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440099'
    const PI_ID = 'pi_test_capturable'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: PI_ID,
          metadata: { booking_id: BOOKING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }], error: null }),
        }),
      }),
    })
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      update: updateMock,
      select: vi.fn(),
    } as never)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'confirmed',
        stripe_payment_intent: PI_ID,
      })
    )
  })

  it('idempotent: second delivery with same booking_id does not double-confirm', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440098'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: 'pi_idempotent',
          metadata: { booking_id: BOOKING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    // Second delivery: eq('status', 'requested') returns empty array — already confirmed
    const selectMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqStatusMock = vi.fn().mockReturnValue({ select: selectMock })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as never)

    const { sendBookingConfirmationEmail } = await import('@/lib/email')

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    await POST(req)

    // Email should NOT be sent when data is empty (already confirmed — idempotency)
    expect(sendBookingConfirmationEmail).not.toHaveBeenCalled()
  })

  // ================================================================
  // S02: recurring_schedules.stripe_payment_method_id storage tests
  // ================================================================

  it('stores stripe_payment_method_id on recurring_schedule when recurring_schedule_id in PI metadata', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440070'
    const RECURRING_ID = '660e8400-e29b-41d4-a716-446655440001'
    const PI_ID = 'pi_recurring_pm'
    const PM_ID = 'pm_test_card_visa'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: PI_ID,
          payment_method: PM_ID,
          metadata: { booking_id: BOOKING_ID, recurring_schedule_id: RECURRING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')

    // Track calls to from() to distinguish bookings vs recurring_schedules
    const isMock = vi.fn().mockResolvedValue({ error: null })
    const recurringEqMock = vi.fn().mockReturnValue({ is: isMock })
    const recurringUpdateMock = vi.fn().mockReturnValue({ eq: recurringEqMock })

    const bookingSelectMock = vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }], error: null })
    const bookingEqStatusMock = vi.fn().mockReturnValue({ select: bookingSelectMock })
    const bookingEqIdMock = vi.fn().mockReturnValue({ eq: bookingEqStatusMock })
    const bookingUpdateMock = vi.fn().mockReturnValue({ eq: bookingEqIdMock })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'recurring_schedules') {
        return { update: recurringUpdateMock } as never
      }
      return { update: bookingUpdateMock } as never
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify recurring_schedules update was called with correct PM ID
    expect(recurringUpdateMock).toHaveBeenCalledWith({ stripe_payment_method_id: PM_ID })
    expect(recurringEqMock).toHaveBeenCalledWith('id', RECURRING_ID)
    expect(isMock).toHaveBeenCalledWith('stripe_payment_method_id', null)
  })

  it('does not update recurring_schedules when recurring_schedule_id is absent from metadata', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440071'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: 'pi_no_recurring',
          payment_method: 'pm_test_card',
          metadata: { booking_id: BOOKING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')

    const bookingSelectMock = vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }], error: null })
    const bookingEqStatusMock = vi.fn().mockReturnValue({ select: bookingSelectMock })
    const bookingEqIdMock = vi.fn().mockReturnValue({ eq: bookingEqStatusMock })
    const bookingUpdateMock = vi.fn().mockReturnValue({ eq: bookingEqIdMock })

    const fromCalls: string[] = []
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      fromCalls.push(table)
      return { update: bookingUpdateMock } as never
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Should never call from('recurring_schedules')
    expect(fromCalls).not.toContain('recurring_schedules')
  })

  it('does not update recurring_schedules when payment_method is null', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440072'
    const RECURRING_ID = '660e8400-e29b-41d4-a716-446655440002'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: 'pi_no_pm',
          payment_method: null,
          metadata: { booking_id: BOOKING_ID, recurring_schedule_id: RECURRING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')

    const bookingSelectMock = vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }], error: null })
    const bookingEqStatusMock = vi.fn().mockReturnValue({ select: bookingSelectMock })
    const bookingEqIdMock = vi.fn().mockReturnValue({ eq: bookingEqStatusMock })
    const bookingUpdateMock = vi.fn().mockReturnValue({ eq: bookingEqIdMock })

    const fromCalls: string[] = []
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      fromCalls.push(table)
      return { update: bookingUpdateMock } as never
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Should never call from('recurring_schedules') when payment_method is null
    expect(fromCalls).not.toContain('recurring_schedules')
  })

  it('sends booking confirmation email after status update', async () => {
    const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440097'

    const mockEvent = {
      type: 'payment_intent.amount_capturable_updated',
      data: {
        object: {
          id: 'pi_sends_email',
          metadata: { booking_id: BOOKING_ID },
        },
      },
    }
    constructEventMock.mockReturnValue(mockEvent)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const selectMock = vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }], error: null })
    const eqStatusMock = vi.fn().mockReturnValue({ select: selectMock })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as never)

    const { sendBookingConfirmationEmail } = await import('@/lib/email')

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest(JSON.stringify(mockEvent))
    await POST(req)

    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.objectContaining({ accountUrl: expect.stringContaining('/account') })
    )
  })
})
