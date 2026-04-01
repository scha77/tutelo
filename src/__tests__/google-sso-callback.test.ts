import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createClient from @/lib/supabase/server using vi.hoisted() pattern
const { mockCreateClient, mockExchangeCodeForSession, mockGetUser, mockFrom } =
  vi.hoisted(() => {
    const mockExchangeCodeForSession = vi.fn()
    const mockGetUser = vi.fn()
    const mockFrom = vi.fn()

    const mockCreateClient = vi.fn().mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        getUser: mockGetUser,
      },
      from: mockFrom,
    })

    return { mockCreateClient, mockExchangeCodeForSession, mockGetUser, mockFrom }
  })

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

describe('OAuth callback route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes teacher to /dashboard', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-teacher-1' } },
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'teacher-row-1' },
          }),
        }),
      }),
    })

    const { NextRequest } = await import('next/server')
    const { GET } = await import('@/app/(auth)/callback/route')

    const req = new NextRequest('http://localhost/callback?code=test-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('Location')!
    expect(location).toContain('/dashboard')
  })

  it('routes non-teacher to /parent', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-parent-1' } },
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
          }),
        }),
      }),
    })

    const { NextRequest } = await import('next/server')
    const { GET } = await import('@/app/(auth)/callback/route')

    const req = new NextRequest('http://localhost/callback?code=test-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('Location')!
    expect(location).toContain('/parent')
    expect(location).not.toContain('/dashboard')
  })

  it('redirects to /login?error=auth when code is missing', async () => {
    const { NextRequest } = await import('next/server')
    const { GET } = await import('@/app/(auth)/callback/route')

    const req = new NextRequest('http://localhost/callback')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('Location')!
    expect(location).toContain('/login?error=auth')
  })

  it('redirects to /login?error=auth when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' },
    })

    const { NextRequest } = await import('next/server')
    const { GET } = await import('@/app/(auth)/callback/route')

    const req = new NextRequest('http://localhost/callback?code=bad-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('Location')!
    expect(location).toContain('/login?error=auth')
  })
})

describe('AUTH-04: verification action is provider-agnostic', () => {
  it('uses getUser() and contains no provider-specific logic', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(
      path.resolve('src/actions/verification.ts'),
      'utf-8'
    )

    // Must use getUser() for authentication
    expect(source).toContain('supabase.auth.getUser()')

    // Must NOT reference any provider-specific identifiers
    expect(source).not.toMatch(/\bprovider\b/)
    expect(source).not.toMatch(/\bgoogle\b/i)
    expect(source).not.toMatch(/getSession\(\)\.provider/)
  })
})
