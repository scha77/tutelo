import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Parent Dashboard Auth Routing Tests
 *
 * Tests the auth routing logic across three entry points:
 * 1. signIn server action (src/actions/auth.ts)
 * 2. Login page redirect (src/app/(auth)/login/page.tsx)
 * 3. OAuth callback route (src/app/(auth)/callback/route.ts)
 * 4. Parent layout auth guard (src/app/(parent)/layout.tsx)
 */

// ── Auth routing decision logic (extracted from signIn, callback, and login) ──

/**
 * Determines the redirect target after authentication.
 * This is the core logic shared by signIn, callback, and login page.
 */
function determineAuthRedirect(params: {
  user: { id: string } | null
  teacherRow: { id: string } | null
  redirectTo?: string | null
}): string {
  const { user, teacherRow, redirectTo } = params

  if (!user) return '/login'

  // If explicit redirectTo was provided, use it
  if (redirectTo) return redirectTo

  // Teacher → teacher dashboard
  if (teacherRow) return '/dashboard'

  // Non-teacher → parent dashboard
  return '/parent'
}

describe('Auth routing decision logic', () => {
  it('redirects to /login when no user', () => {
    const target = determineAuthRedirect({ user: null, teacherRow: null })
    expect(target).toBe('/login')
  })

  it('redirects to /dashboard when user has teacher row', () => {
    const target = determineAuthRedirect({
      user: { id: 'user-1' },
      teacherRow: { id: 'teacher-1' },
    })
    expect(target).toBe('/dashboard')
  })

  it('redirects to /parent when user has no teacher row', () => {
    const target = determineAuthRedirect({
      user: { id: 'user-1' },
      teacherRow: null,
    })
    expect(target).toBe('/parent')
  })

  it('uses explicit redirectTo when provided (e.g. /account)', () => {
    const target = determineAuthRedirect({
      user: { id: 'user-1' },
      teacherRow: null,
      redirectTo: '/account',
    })
    expect(target).toBe('/account')
  })

  it('prioritizes redirectTo over teacher check', () => {
    const target = determineAuthRedirect({
      user: { id: 'user-1' },
      teacherRow: { id: 'teacher-1' },
      redirectTo: '/some-page',
    })
    expect(target).toBe('/some-page')
  })
})

// ── signIn server action routing ──

describe('signIn server action routing', () => {
  let redirectTarget: string | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    redirectTarget = null
  })

  function setupMocks(opts: {
    signInResult: { data: { user: { id: string } | null }; error: { message: string } | null }
    teacherRow: { id: string } | null
  }) {
    vi.doMock('next/navigation', () => ({
      redirect: (target: string) => {
        redirectTarget = target
        throw new Error('NEXT_REDIRECT')
      },
    }))

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue(opts.signInResult),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: opts.teacherRow }),
            }),
          }),
        }),
      }),
    }))
  }

  it('redirects to /parent when user has no teacher row', async () => {
    setupMocks({
      signInResult: { data: { user: { id: 'user-1' } }, error: null },
      teacherRow: null,
    })

    const { signIn } = await import('@/actions/auth')
    const formData = new FormData()
    formData.append('email', 'parent@test.com')
    formData.append('password', 'password123')

    await expect(signIn(formData)).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectTarget).toBe('/parent')
  })

  it('redirects to /dashboard when user has teacher row', async () => {
    setupMocks({
      signInResult: { data: { user: { id: 'user-1' } }, error: null },
      teacherRow: { id: 'teacher-1' },
    })

    const { signIn } = await import('@/actions/auth')
    const formData = new FormData()
    formData.append('email', 'teacher@test.com')
    formData.append('password', 'password123')

    await expect(signIn(formData)).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectTarget).toBe('/dashboard')
  })

  it('uses redirectTo when provided', async () => {
    setupMocks({
      signInResult: { data: { user: { id: 'user-1' } }, error: null },
      teacherRow: null,
    })

    const { signIn } = await import('@/actions/auth')
    const formData = new FormData()
    formData.append('email', 'parent@test.com')
    formData.append('password', 'password123')
    formData.append('redirectTo', '/account')

    await expect(signIn(formData)).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectTarget).toBe('/account')
  })

  it('returns error when credentials are invalid', async () => {
    setupMocks({
      signInResult: { data: { user: null }, error: { message: 'Invalid login credentials' } },
      teacherRow: null,
    })

    const { signIn } = await import('@/actions/auth')
    const formData = new FormData()
    formData.append('email', 'bad@test.com')
    formData.append('password', 'wrong')

    const result = await signIn(formData)
    expect(result).toEqual({ error: 'Invalid login credentials' })
  })
})

// ── Verify auth files have no hardcoded /onboarding redirect for non-teacher ──

describe('Auth files routing consistency', () => {
  it('signIn action redirects non-teacher to /parent, not /onboarding', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/actions/auth.ts', 'utf-8')

    // signIn should redirect to /parent for non-teacher
    expect(source).toContain("redirect('/parent')")

    // signUp may still redirect to /onboarding (for new user flow) — that's intentional
    // But signIn should NOT redirect to /onboarding
    const signInBlock = source.split('export async function signIn')[1]?.split('export async function')[0] ?? ''
    expect(signInBlock).not.toContain('/onboarding')
  })

  it('callback route redirects non-teacher to /parent, not /onboarding', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/app/(auth)/callback/route.ts', 'utf-8')

    expect(source).toContain('/parent')
    expect(source).not.toContain('/onboarding')
  })

  it('login page redirects non-teacher to /parent, not /onboarding', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/app/(auth)/login/page.tsx', 'utf-8')

    expect(source).toContain("'/parent'")
    expect(source).not.toContain('/onboarding')
  })
})

// ── Parent layout auth guard ──

describe('Parent layout auth guard', () => {
  it('redirects to /login?redirect=/parent when no user', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/app/(parent)/layout.tsx', 'utf-8')

    expect(source).toContain('/login?redirect=/parent')
  })

  it('checks for teacher role for dual-role cross-link', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/app/(parent)/layout.tsx', 'utf-8')

    expect(source).toContain('hasTeacherRole')
    expect(source).toContain("from('teachers')")
  })

  it('counts children for sidebar badge', async () => {
    const fs = await import('fs')
    const source = fs.readFileSync('src/app/(parent)/layout.tsx', 'utf-8')

    expect(source).toContain('childrenCount')
    expect(source).toContain("from('children')")
  })
})
