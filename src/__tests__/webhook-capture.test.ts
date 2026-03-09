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
