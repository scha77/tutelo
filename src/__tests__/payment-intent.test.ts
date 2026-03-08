import { describe, it } from 'vitest'

describe('PaymentIntent creation (create-intent API route)', () => {
  it.todo('creates PaymentIntent with capture_method manual')
  it.todo('uses destination charge: on_behalf_of + transfer_data.destination = teacher stripe_account_id')
  it.todo('sets receipt_email from authenticated user email')
  it.todo('encodes booking metadata (teacher_id, booking_date, start_time, student_name, subject)')
  it.todo('returns clientSecret to client')
})
