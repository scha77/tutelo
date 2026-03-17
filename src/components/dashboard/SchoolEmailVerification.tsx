'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { requestSchoolEmailVerification } from '@/actions/verification'
import { CheckCircle, Mail, Loader2 } from 'lucide-react'

interface SchoolEmailVerificationProps {
  isVerified: boolean
  verifiedParam?: boolean
  errorParam?: string
}

export function SchoolEmailVerification({
  isVerified,
  verifiedParam,
  errorParam,
}: SchoolEmailVerificationProps) {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  // Show toasts for redirect feedback from /api/verify-email
  useEffect(() => {
    if (verifiedParam) {
      toast.success(
        'School email verified! Your profile now shows the Verified Teacher badge.'
      )
    }
    if (errorParam === 'invalid') {
      toast.error(
        'Verification link is invalid or has already been used.'
      )
    }
    if (errorParam === 'expired') {
      toast.error(
        'Verification link has expired. Please request a new one.'
      )
    }
  }, [verifiedParam, errorParam])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await requestSchoolEmailVerification(email)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Verification link sent! Check your inbox.')
        setEmail('')
      }
    })
  }

  if (isVerified) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-emerald-600">
              School email verified
            </h2>
            <p className="text-sm text-muted-foreground">
              Your profile displays the Verified Teacher badge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Verify your school email</h2>
          <p className="text-sm text-muted-foreground">
            Verify your school email to earn a Verified Teacher badge on your
            profile.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="school-email">School email address</Label>
          <Input
            id="school-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.name@school.edu"
            required
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending || !email}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send verification link'
          )}
        </Button>
      </form>
    </div>
  )
}
