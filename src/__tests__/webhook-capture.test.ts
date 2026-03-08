import { describe, it } from 'vitest'

describe('payment_intent.amount_capturable_updated webhook handler', () => {
  it.todo('updates booking status to confirmed on payment_intent.amount_capturable_updated')
  it.todo('idempotent: second delivery with same booking_id does not double-confirm')
  it.todo('sends booking confirmation email after status update')
  it.todo('skips processing if booking_id missing from PaymentIntent metadata')
  it.todo('verifies Stripe webhook signature before processing')
})
