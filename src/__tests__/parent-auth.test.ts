import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock supabase client
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

// Ensure the Server Action signIn is NOT called (it would redirect away)
vi.mock('@/actions/auth', () => ({
  signIn: vi.fn(() => { throw new Error('signIn Server Action must not be called from InlineAuthForm') }),
  signUp: vi.fn(() => { throw new Error('signUp Server Action must not be called from InlineAuthForm') }),
}))

import { InlineAuthForm } from '@/components/auth/InlineAuthForm'

const ACCENT_COLOR = '#4F46E5'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InlineAuthForm', () => {
  it('calls onAuthSuccess when signInWithPassword succeeds', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })
    const onAuthSuccess = vi.fn()

    render(React.createElement(InlineAuthForm, { onAuthSuccess, accentColor: ACCENT_COLOR }))

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'parent@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'parent@test.com',
        password: 'password123',
      })
      expect(onAuthSuccess).toHaveBeenCalledOnce()
    })
  })

  it('displays error message when signInWithPassword fails', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    const onAuthSuccess = vi.fn()

    render(React.createElement(InlineAuthForm, { onAuthSuccess, accentColor: ACCENT_COLOR }))

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'parent@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeTruthy()
      expect(onAuthSuccess).not.toHaveBeenCalled()
    })
  })

  it('toggles to signup mode and calls signUp on submit', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null })
    const onAuthSuccess = vi.fn()

    render(React.createElement(InlineAuthForm, { onAuthSuccess, accentColor: ACCENT_COLOR }))

    // Toggle to signup
    fireEvent.click(screen.getByRole('button', { name: /create one/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newparent@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'newpassword123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newparent@test.com',
        password: 'newpassword123',
      })
      expect(onAuthSuccess).toHaveBeenCalledOnce()
    })
  })

  it('does not invoke the signIn Server Action', async () => {
    const { signIn } = await import('@/actions/auth')
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })
    const onAuthSuccess = vi.fn()

    render(React.createElement(InlineAuthForm, { onAuthSuccess, accentColor: ACCENT_COLOR }))

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'parent@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalled())

    expect(signIn).not.toHaveBeenCalled()
  })
})
