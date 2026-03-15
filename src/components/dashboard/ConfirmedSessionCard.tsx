'use client'

import { useState, useTransition } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { toast } from 'sonner'
import { AnimatedButton } from '@/components/shared/AnimatedButton'

interface ConfirmedSessionCardProps {
  booking: {
    id: string
    student_name: string
    subject: string
    booking_date: string
    start_time: string
    parent_email: string
  }
  teacherTimezone: string
  markCompleteAction: (id: string) => Promise<{ success?: true; error?: string }>
}

export function ConfirmedSessionCard({
  booking,
  teacherTimezone,
  markCompleteAction,
}: ConfirmedSessionCardProps) {
  const [isPending, startTransition] = useTransition()
  const [, setDone] = useState(false)

  // Format booking date/time in teacher's timezone
  const dt = new Date(`${booking.booking_date}T${booking.start_time.slice(0, 5)}`)
  const formattedDateTime = formatInTimeZone(dt, teacherTimezone, "EEE, MMM d · h:mm a")

  function handleMarkComplete() {
    startTransition(async () => {
      const result = await markCompleteAction(booking.id)
      if (result.error) {
        toast.error(`Failed to mark complete: ${result.error}`)
      } else {
        setDone(true)
        toast.success('Session marked complete — payment captured!')
      }
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
        <span className="text-sm rounded-full bg-green-100 px-2 py-0.5 text-green-700">
          Confirmed
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

      {/* Mark Complete button */}
      <div className="mt-4">
        <AnimatedButton className="inline-block">
          <button
            onClick={handleMarkComplete}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Capturing payment…' : 'Mark Complete'}
          </button>
        </AnimatedButton>
      </div>
    </div>
  )
}
