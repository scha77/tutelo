import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Tracking variables for redirect & notFound ──

let redirectTarget: string | null = null
let notFoundCalled = false

// ── Module mocks ──

vi.mock('next/navigation', () => ({
  redirect: (target: string) => {
    redirectTarget = target
    throw new Error('NEXT_REDIRECT')
  },
  notFound: () => {
    notFoundCalled = true
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('@/lib/supabase/auth-cache', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@/actions/auth', () => ({
  signOut: vi.fn(),
}))

// ── Constants ──

const ADMIN_USER_ID = 'aaa00000-0000-0000-0000-000000000001'
const NON_ADMIN_USER_ID = 'bbb00000-0000-0000-0000-000000000002'

// ── Helpers ──

/**
 * Configure the getAuthUser mock to return the given user (or null for no-session).
 * The returned supabase stub includes auth.getUser() for the email fetch in the layout.
 */
function setupAuth(user: { id: string; email?: string } | null, error?: boolean) {
  const supabaseStub = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: user ? { ...user, email: user.email } : null },
        error: error ? { message: 'No session' } : null,
      }),
    },
  }
  return {
    user: user ? { id: user.id } : null,
    error: error ? { message: 'No session' } : null,
    supabase: supabaseStub,
  }
}

// ═══════════════════════════════════════════════════════════════
// Admin Layout — Access Gate Tests
// ═══════════════════════════════════════════════════════════════

describe('Admin Layout — access gate', () => {
  const originalEnv = process.env.ADMIN_USER_IDS

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    redirectTarget = null
    notFoundCalled = false
    // Re-register mocks after resetModules
    vi.mock('next/navigation', () => ({
      redirect: (target: string) => {
        redirectTarget = target
        throw new Error('NEXT_REDIRECT')
      },
      notFound: () => {
        notFoundCalled = true
        throw new Error('NEXT_NOT_FOUND')
      },
    }))
    vi.mock('@/lib/supabase/auth-cache', () => ({
      getAuthUser: vi.fn(),
    }))
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: { from: vi.fn() },
    }))
    vi.mock('@/actions/auth', () => ({
      signOut: vi.fn(),
    }))
  })

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.ADMIN_USER_IDS = originalEnv
    } else {
      delete process.env.ADMIN_USER_IDS
    }
  })

  it('redirects to /login when no user session', async () => {
    process.env.ADMIN_USER_IDS = ADMIN_USER_ID

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(setupAuth(null, true) as never)

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    await expect(
      AdminLayout({ children: 'test' as never })
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(redirectTarget).toBe('/login')
    expect(notFoundCalled).toBe(false)
  })

  it('returns 404 when user is not in ADMIN_USER_IDS', async () => {
    process.env.ADMIN_USER_IDS = ADMIN_USER_ID

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(
      setupAuth({ id: NON_ADMIN_USER_ID, email: 'nonadmin@test.com' }) as never
    )

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    await expect(
      AdminLayout({ children: 'test' as never })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFoundCalled).toBe(true)
    expect(redirectTarget).toBeNull()
  })

  it('returns 404 when ADMIN_USER_IDS is empty string', async () => {
    process.env.ADMIN_USER_IDS = ''

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(
      setupAuth({ id: ADMIN_USER_ID, email: 'admin@test.com' }) as never
    )

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    await expect(
      AdminLayout({ children: 'test' as never })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFoundCalled).toBe(true)
  })

  it('returns 404 when ADMIN_USER_IDS is undefined', async () => {
    delete process.env.ADMIN_USER_IDS

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(
      setupAuth({ id: ADMIN_USER_ID, email: 'admin@test.com' }) as never
    )

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    await expect(
      AdminLayout({ children: 'test' as never })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFoundCalled).toBe(true)
  })

  it('renders children when user is admin (no redirect, no notFound)', async () => {
    process.env.ADMIN_USER_IDS = ADMIN_USER_ID

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(
      setupAuth({ id: ADMIN_USER_ID, email: 'admin@test.com' }) as never
    )

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    // Should NOT throw — admin user passes the gate
    const result = await AdminLayout({ children: 'test-content' as never })

    // Verify no redirect or notFound was triggered
    expect(redirectTarget).toBeNull()
    expect(notFoundCalled).toBe(false)
    // Result should be a JSX element (the layout wrapper)
    expect(result).toBeTruthy()
  })

  it('allows admin when ADMIN_USER_IDS has multiple IDs with whitespace', async () => {
    process.env.ADMIN_USER_IDS = `  other-id , ${ADMIN_USER_ID} , another-id  `

    const { getAuthUser } = await import('@/lib/supabase/auth-cache')
    vi.mocked(getAuthUser).mockResolvedValue(
      setupAuth({ id: ADMIN_USER_ID, email: 'admin@test.com' }) as never
    )

    const { default: AdminLayout } = await import('@/app/(admin)/layout')

    const result = await AdminLayout({ children: 'test-content' as never })

    expect(redirectTarget).toBeNull()
    expect(notFoundCalled).toBe(false)
    expect(result).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════
// Admin Page — Metrics & Activity Feed Tests
// ═══════════════════════════════════════════════════════════════

describe('Admin Page — metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: { from: vi.fn() },
    }))
  })

  /**
   * Build a mock chain for supabaseAdmin.from() that handles
   * the 9 parallel queries in AdminPage's Promise.all.
   */
  function setupMetricsMock(opts?: { nullRevenue?: boolean }) {
    const fromMock = vi.fn()

    // Queries 1-3: teachers counts (select with head:true → .count)
    // Query 1: total teachers
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ count: 10, data: null, error: null }),
    })
    // Query 2: active teachers (stripe_charges_enabled)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 7, data: null, error: null }),
      }),
    })
    // Query 3: published teachers
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5, data: null, error: null }),
      }),
    })
    // Query 4: total bookings
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ count: 50, data: null, error: null }),
    })
    // Query 5: completed bookings
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 30, data: null, error: null }),
      }),
    })
    // Query 6: revenue (completed bookings with amount_cents)
    const revenueData = opts?.nullRevenue
      ? [{ amount_cents: null }, { amount_cents: null }]
      : [{ amount_cents: 5000 }, { amount_cents: 3000 }]
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: revenueData, error: null }),
      }),
    })

    // Queries 7-9: activity feed
    // Query 7: recent signups
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { full_name: 'Alice Teacher', created_at: '2026-03-30T10:00:00Z' },
            ],
            error: null,
          }),
        }),
      }),
    })
    // Query 8: recent bookings
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { student_name: 'Bob Student', created_at: '2026-03-30T11:00:00Z', status: 'confirmed' },
            ],
            error: null,
          }),
        }),
      }),
    })
    // Query 9: recent completions
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { student_name: 'Carol Student', updated_at: '2026-03-30T12:00:00Z', status: 'completed' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    })

    return fromMock
  }

  it('fetches and displays metric counts without error', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = setupMetricsMock()
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { default: AdminPage } = await import('@/app/(admin)/admin/page')

    // Should resolve without throwing
    const result = await AdminPage()

    expect(result).toBeTruthy()
    // Verify all 9 queries were dispatched
    expect(fromMock).toHaveBeenCalledTimes(9)
    // Verify table names
    expect(fromMock).toHaveBeenCalledWith('teachers')
    expect(fromMock).toHaveBeenCalledWith('bookings')
  })

  it('handles null revenue (amount_cents) gracefully', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = setupMetricsMock({ nullRevenue: true })
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { default: AdminPage } = await import('@/app/(admin)/admin/page')

    // Should resolve without throwing even when all amount_cents are null
    const result = await AdminPage()

    expect(result).toBeTruthy()
    expect(fromMock).toHaveBeenCalledTimes(9)
  })

  it('handles empty activity feed data', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // Queries 1-6: same as normal
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
      }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
      }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
      }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    // Queries 7-9: all return empty arrays
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { default: AdminPage } = await import('@/app/(admin)/admin/page')

    const result = await AdminPage()
    expect(result).toBeTruthy()
    expect(fromMock).toHaveBeenCalledTimes(9)
  })
})
