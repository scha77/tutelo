import { describe, it, vi } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockCheckoutSessionsCreate, mockWebhooksConstructEvent } = vi.hoisted(() => {
  const mockCheckoutSessionsCreate = vi.fn()
  const mockWebhooksConstructEvent = vi.fn()
  return { mockCheckoutSessionsCreate, mockWebhooksConstructEvent }
})

// Mock Stripe — class-based so `new Stripe()` works
vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: mockCheckoutSessionsCreate } }
    webhooks = { constructEvent: mockWebhooksConstructEvent }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey?: string) {}
  }
  return { default: MockStripe }
})

// Mock supabaseAdmin — service role client used in webhook handlers
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

// Mock email module to assert sendCheckoutLinkEmail calls
vi.mock('@/lib/email', () => ({
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
  sendFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendUrgentFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('createCheckoutSessionsForTeacher (account.updated handler)', () => {
  it.todo(
    'creates a Checkout session with capture_method: manual for each requested booking where stripe_payment_intent is null'
  )

  it.todo(
    'session includes on_behalf_of and transfer_data.destination set to the teacher stripe_account_id'
  )

  it.todo('session metadata includes booking_id')

  it.todo('stripe_checkout_url is stored on the booking after session creation')

  it.todo(
    'skips bookings that already have stripe_payment_intent set (idempotency — prevents duplicate Checkout sessions)'
  )
})

describe('checkout.session.completed handler', () => {
  it.todo(
    'updates booking status to confirmed and stores stripe_payment_intent when current status is requested'
  )

  it.todo(
    'does NOT update booking if status is already confirmed (idempotency guard on status = requested)'
  )
})
