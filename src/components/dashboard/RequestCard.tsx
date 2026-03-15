'use client'

import { useState, useTransition } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import { AnimatedButton } from '@/components/shared/AnimatedButton'

interface RequestCardProps {
  booking: {
    id: string
    student_name: string
    subject: string
    booking_date: string
    start_time: string
    parent_email: string
    created_at: string
  }
  teacherTimezone: string
  stripeConnected: boolean
  acceptAction: (id: string) => Promise<{ success?: true; error?: string }>
  declineAction: (id: string) => Promise<{ success?: true; error?: string }>
}

export function RequestCard({
  booking,
  teacherTimezone,
  stripeConnected,
  acceptAction,
  declineAction,
}: RequestCardProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<'accept' | 'decline' | null>(null)

  // Format booking date/time in teacher's timezone
  const dt = new Date(`${booking.booking_date}T${booking.start_time.slice(0, 5)}`)
  const formattedDateTime = formatInTimeZone(dt, teacherTimezone, "EEE, MMM d · h:mm a")

  // Format submitted-ago
  const submittedAgo = formatDistanceToNow(parseISO(booking.created_at), { addSuffix: true })

  function handleAccept() {
    setPendingAction('accept')
    startTransition(async () => {
      const result = await acceptAction(booking.id)
      if (result.error) {
        toast.error(`Failed to accept: ${result.error}`)
      }
      setPendingAction(null)
    })
  }

  function handleDecline() {
    setPendingAction('decline')
    startTransition(async () => {
      const result = await declineAction(booking.id)
      if (result.error) {
        toast.error(`Failed to decline: ${result.error}`)
      }
      setPendingAction(null)
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      {/* Header: student name + subject badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground">{booking.student_name}</span>
        <span className="text-sm rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {booking.subject}
        </span>
      </div>

      {/* Date/time in teacher timezone */}
      <p className="mt-2 text-sm text-foreground">{formattedDateTime}</p>

      {/* Parent email */}
      <a
        href={`mailto:${booking.parent_email}`}
        className="mt-1 block text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {booking.parent_email}
      </a>

      {/* Submitted-ago */}
      <p className="mt-1 text-xs text-muted-foreground">Submitted {submittedAgo}</p>

      {/* Accept / Decline buttons */}
      <div className="mt-4 flex items-center gap-2">
        {stripeConnected ? (
          <AnimatedButton className="inline-block">
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && pendingAction === 'accept' ? 'Accepting…' : 'Accept'}
            </button>
          </AnimatedButton>
        ) : (
          <Link
            href="/dashboard/connect-stripe"
            className="rounded-md bg-[#635BFF] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#5249d6] transition-colors"
          >
            Connect Stripe to confirm
          </Link>
        )}
        <AnimatedButton className="inline-block">
          <button
            onClick={handleDecline}
            disabled={isPending}
            className="rounded-md border border-destructive px-4 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && pendingAction === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </AnimatedButton>
      </div>
    </div>
  )
}
