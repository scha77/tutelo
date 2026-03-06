import { describe, it, vi } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockAccountsCreate, mockAccountLinksCreate } = vi.hoisted(() => {
  const mockAccountsCreate = vi.fn()
  const mockAccountLinksCreate = vi.fn()
  return { mockAccountsCreate, mockAccountLinksCreate }
})

// Mock Stripe — class-based so `new Stripe()` works
vi.mock('stripe', () => {
  class MockStripe {
    accounts = { create: mockAccountsCreate }
    accountLinks = { create: mockAccountLinksCreate }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey?: string) {}
  }
  return { default: MockStripe }
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock next/navigation redirect — Next.js throws NEXT_REDIRECT in real code;
// in tests, we just track the call without throwing
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('connectStripe Server Action', () => {
  it.todo(
    'when teacher has no stripe_account_id — calls stripe.accounts.create(), saves account id to DB, creates accountLink, and redirects (NEXT_REDIRECT)'
  )

  it.todo(
    'when teacher already has stripe_account_id — skips account creation, calls stripe.accountLinks.create() for existing account id'
  )

  it.todo(
    'when stripe_charges_enabled = true — redirects to /dashboard immediately without calling Stripe'
  )

  it.todo('when not authenticated — returns { error: "Not authenticated" }')
})
