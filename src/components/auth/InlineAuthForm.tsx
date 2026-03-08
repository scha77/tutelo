'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InlineAuthFormProps {
  onAuthSuccess: () => void
  accentColor: string
}

/**
 * Inline Supabase auth step for the booking flow.
 * Uses client-side supabase auth — NOT Server Actions (which redirect away from the booking page).
 */
export function InlineAuthForm({ onAuthSuccess, accentColor }: InlineAuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        onAuthSuccess()
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
      } else {
        onAuthSuccess()
      }
    }

    setLoading(false)
  }

  async function handleGoogleAuth() {
    const supabase = createClient()
    // Note: Google OAuth redirects away from the current page — booking state will be lost.
    // This is an MVP accepted limitation. Future: use popup mode or state persistence.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h3 className="text-base font-semibold">
        {mode === 'signin'
          ? 'Sign in to confirm your booking'
          : 'Create an account to confirm your booking'}
      </h3>

      <form onSubmit={handleEmailAuth} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="inline-email">Email</Label>
          <Input
            id="inline-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-password">Password</Label>
          <Input
            id="inline-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-full font-semibold"
          style={{ backgroundColor: accentColor, color: 'white' }}
        >
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <div className="text-sm text-muted-foreground text-center">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null) }}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null) }}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleAuth}
      >
        Continue with Google
      </Button>
    </div>
  )
}
