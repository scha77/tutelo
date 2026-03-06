import { describe, it } from 'vitest'

describe('submitBookingRequest', () => {
  it.todo('returns { success: true, bookingId } on valid insert')
  it.todo("returns { success: false, error: 'slot_taken' } on duplicate")
  it.todo("returns { success: false, error: 'validation' } on bad input")
})

describe('acceptBooking', () => {
  it.todo("changes booking status to 'pending'")
})

describe('declineBooking', () => {
  it.todo("changes booking status to 'cancelled'")
})
