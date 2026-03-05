import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation redirect
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    // redirect() throws in Next.js — simulate by throwing
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

// Mock Supabase server client
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockMaybeSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    }),
  }),
}))

describe('auth signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp Server Action', () => {
    it('email signup creates a session and redirects to /onboarding', async () => {
      // Arrange
      mockSignUp.mockResolvedValue({ error: null })
      const { signUp } = await import('@/actions/auth')
      const formData = new FormData()
      formData.set('email', 'teacher@example.com')
      formData.set('password', 'password123')

      // Act & Assert — redirect throws NEXT_REDIRECT
      await expect(signUp(formData)).rejects.toThrow('NEXT_REDIRECT:/onboarding')
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: 'password123',
      })
    })

    it('duplicate email returns descriptive error', async () => {
      // Arrange
      mockSignUp.mockResolvedValue({
        error: { message: 'User already registered' },
      })
      const { signUp } = await import('@/actions/auth')
      const formData = new FormData()
      formData.set('email', 'existing@example.com')
      formData.set('password', 'password123')

      // Act
      const result = await signUp(formData)

      // Assert — no redirect, returns error object
      expect(result).toEqual({ error: 'User already registered' })
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('signIn Server Action', () => {
    it('successful sign in redirects to /dashboard', async () => {
      // Arrange
      mockSignInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: 'mock-user-id' } },
      })
      mockMaybeSingle.mockResolvedValue({ data: { is_published: true } })
      const { signIn } = await import('@/actions/auth')
      const formData = new FormData()
      formData.set('email', 'teacher@example.com')
      formData.set('password', 'password123')

      // Act & Assert
      await expect(signIn(formData)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    })

    it('wrong credentials returns descriptive error', async () => {
      // Arrange
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      })
      const { signIn } = await import('@/actions/auth')
      const formData = new FormData()
      formData.set('email', 'teacher@example.com')
      formData.set('password', 'wrongpassword')

      // Act
      const result = await signIn(formData)

      // Assert
      expect(result).toEqual({ error: 'Invalid login credentials' })
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })
})
