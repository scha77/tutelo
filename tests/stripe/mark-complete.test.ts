import { describe, it, vi } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockPaymentIntentsRetrieve, mockPaymentIntentsCapture } = vi.hoisted(() => {
  const mockPaymentIntentsRetrieve = vi.fn()
  const mockPaymentIntentsCapture = vi.fn()
  return { mockPaymentIntentsRetrieve, mockPaymentIntentsCapture }
})

// Mock Stripe — class-based so `new Stripe()` works
vi.mock('stripe', () => {
  class MockStripe {
    paymentIntents = {
      retrieve: mockPaymentIntentsRetrieve,
      capture: mockPaymentIntentsCapture,
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey?: string) {}
  }
  return { default: MockStripe }
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock email module
vi.mock('@/lib/email', () => ({
  sendSessionCompleteEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('markSessionComplete', () => {
  it.todo('retrieves PaymentIntent and calls paymentIntents.capture() with correct amount')

  it.todo('application_fee_amount is exactly 7% of amount_capturable (STRIPE-07)')

  it.todo("booking status is updated to 'completed' after capture")

  it.todo('sendSessionCompleteEmail is called with the bookingId after capture')

  it.todo("returns { error } if booking not found or not in 'confirmed' state")

  it.todo("returns { error: 'Not authenticated' } if no user session")
})
