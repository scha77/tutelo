import { describe, it } from 'vitest'

describe('direct booking routing', () => {
  it.todo('returns clientSecret for teacher with stripe_charges_enabled = true')
  it.todo('returns 400 when teacher stripe_charges_enabled = false')
  it.todo('returns 401 when parent is not authenticated')
  it.todo('includes 7% application_fee_amount in PaymentIntent')
  it.todo('stores booking row with status requested before returning clientSecret')
  it.todo('sets parent_id on booking row from authenticated user')
})
