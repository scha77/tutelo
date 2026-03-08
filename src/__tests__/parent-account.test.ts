import { describe, it } from 'vitest'

describe('/account page', () => {
  it.todo('redirects to /login?redirect=/account when user is not authenticated')
  it.todo('redirects to /dashboard when authenticated user has a teachers row')
  it.todo('splits bookings into upcoming (confirmed, future) and past (completed or past date)')
  it.todo('shows empty state when parent has no bookings')
  it.todo('renders teacher full_name and slug for each booking')
})
