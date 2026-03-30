'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface WaitlistFormProps {
  teacherId: string
  accentColor: string
}

export function WaitlistForm({ teacherId, accentColor }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'already' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, email }),
      })

      if (res.status === 201) {
        setStatus('success')
      } else if (res.status === 409) {
        setStatus('already')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMessage(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm">You&apos;re on the list! We&apos;ll email you when a spot opens up.</p>
      </div>
    )
  }

  if (status === 'already') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm">You&apos;re already on the waitlist. We&apos;ll notify you when a spot opens.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
          disabled={status === 'submitting'}
        />
        <Button
          type="submit"
          disabled={!isValidEmail || status === 'submitting'}
          style={{ backgroundColor: accentColor }}
          className="text-white hover:opacity-90 transition-opacity"
        >
          {status === 'submitting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Notify Me'
          )}
        </Button>
      </div>
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}
    </form>
  )
}
