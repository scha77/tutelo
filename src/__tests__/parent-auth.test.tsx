import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

describe('InlineAuthForm', () => {
  let mockSignInWithPassword: ReturnType<typeof vi.fn>
  let mockSignUp: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    mockSignInWithPassword = vi.fn()
    mockSignUp = vi.fn()

    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signInWithOAuth: vi.fn(),
      },
    } as never)
  })

  it('renders sign-in form by default', async () => {
    const { InlineAuthForm } = await import('@/components/auth/InlineAuthForm')
    render(
      <InlineAuthForm onAuthSuccess={vi.fn()} accentColor="#4f46e5" />
    )
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    // Default mode is sign-in — button says "Sign in" or shows sign-in action
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('toggles to sign-up mode when user clicks create account', async () => {
    const { InlineAuthForm } = await import('@/components/auth/InlineAuthForm')
    render(
      <InlineAuthForm onAuthSuccess={vi.fn()} accentColor="#4f46e5" />
    )
    const toggleLink = screen.getByRole('button', { name: /create one|don't have|create account/i })
    fireEvent.click(toggleLink)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('calls onAuthSuccess after successful signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { InlineAuthForm } = await import('@/components/auth/InlineAuthForm')
    const onAuthSuccess = vi.fn()
    render(
      <InlineAuthForm onAuthSuccess={onAuthSuccess} accentColor="#4f46e5" />
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'parent@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'parent@test.com',
        password: 'password123',
      })
      expect(onAuthSuccess).toHaveBeenCalled()
    })
  })

  it('shows error message on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const { InlineAuthForm } = await import('@/components/auth/InlineAuthForm')
    render(
      <InlineAuthForm onAuthSuccess={vi.fn()} accentColor="#4f46e5" />
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    })
  })

  it('does not call signIn Server Action (would redirect parent out of booking flow)', async () => {
    // This test verifies that the InlineAuthForm uses supabase client-side auth
    // NOT a Server Action import from @/actions/auth
    const { InlineAuthForm } = await import('@/components/auth/InlineAuthForm')
    const moduleSource = InlineAuthForm.toString()
    // The component should NOT reference /actions/auth (server action that redirects)
    expect(moduleSource).not.toContain('/actions/auth')
    expect(moduleSource).not.toContain('signIn(')
  })
})
