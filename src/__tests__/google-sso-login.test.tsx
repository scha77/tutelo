import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock supabase client
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

// Mock server actions to prevent "use server" import issues
vi.mock('@/actions/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
}))

// Mock react-hook-form to avoid issues in test env
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form')
  return actual
})

describe('LoginForm Google SSO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
  })

  it('renders the Google sign-in button and it is enabled by default', async () => {
    const LoginForm = (await import('@/components/auth/LoginForm')).default
    render(<LoginForm />)

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    expect(googleButton).toBeInTheDocument()
    expect(googleButton).toBeEnabled()
  })

  it('calls signInWithOAuth with provider google and correct redirectTo on click', async () => {
    const LoginForm = (await import('@/components/auth/LoginForm')).default
    render(<LoginForm />)

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1)
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/callback'),
        },
      })

      // Verify the redirectTo does NOT contain /auth/callback (the old bug)
      const callArgs = mockSignInWithOAuth.mock.calls[0][0]
      expect(callArgs.options.redirectTo).not.toContain('/auth/callback')
    })
  })
})
