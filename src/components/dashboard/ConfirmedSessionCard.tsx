'use client'

import { useState, useTransition } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { toast } from 'sonner'

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
  cancelSessionAction: (id: string) => Promise<{ success?: true; error?: string }>
  recurringScheduleId?: string | null
  bookingStatus?: string
  cancelSeriesAction?: (id: string) => Promise<{ success?: true; error?: string }>
}

export function ConfirmedSessionCard({
  booking,
  teacherTimezone,
  markCompleteAction,
  cancelSessionAction,
  recurringScheduleId,
  bookingStatus,
  cancelSeriesAction,
}: ConfirmedSessionCardProps) {
  const [isCompletePending, startCompleteTransition] = useTransition()
  const [isCancelPending, startCancelTransition] = useTransition()
  const [isCancelSeriesPending, startCancelSeriesTransition] = useTransition()
  const [, setDone] = useState(false)

  const anyPending = isCompletePending || isCancelPending || isCancelSeriesPending

  // Format booking date/time in teacher's timezone
  const dt = new Date(`${booking.booking_date}T${booking.start_time.slice(0, 5)}`)
  const formattedDateTime = formatInTimeZone(dt, teacherTimezone, "EEE, MMM d · h:mm a")

  function handleMarkComplete() {
    startCompleteTransition(async () => {
      const result = await markCompleteAction(booking.id)
      if (result.error) {
        toast.error(`Failed to mark complete: ${result.error}`)
      } else {
        setDone(true)
        toast.success('Session marked complete — payment captured!')
      }
    })
  }

  function handleCancelSession() {
    const confirmed = window.confirm(
      'Cancel this session? The parent will be notified and the payment authorization will be released.'
    )
    if (!confirmed) return

    startCancelTransition(async () => {
      const result = await cancelSessionAction(booking.id)
      if (result.error) {
        toast.error(`Failed to cancel: ${result.error}`)
      } else {
        toast.success('Session cancelled — parent notified')
      }
    })
  }

  function handleCancelSeries() {
    if (!recurringScheduleId || !cancelSeriesAction) return

    const confirmed = window.confirm(
      'Cancel ALL remaining sessions in this recurring series? The parent will be notified and all payment authorizations will be released.'
    )
    if (!confirmed) return

    startCancelSeriesTransition(async () => {
      const result = await cancelSeriesAction(recurringScheduleId)
      if (result.error) {
        toast.error(`Failed to cancel series: ${result.error}`)
      } else {
        toast.success('Recurring series cancelled — parent notified')
      }
    })
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: student name + subject badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground">{booking.student_name}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-primary"
          style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
        >
          {booking.subject}
        </span>
        {recurringScheduleId && (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50">
            Recurring
          </span>
        )}
        {bookingStatus === 'payment_failed' ? (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50">
            Payment Failed
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50">
            Confirmed
          </span>
        )}
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

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        <div className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.97]">
          <button
            onClick={handleMarkComplete}
            disabled={anyPending}
            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompletePending ? 'Capturing payment…' : 'Mark Complete'}
          </button>
        </div>
        <div className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.97]">
          <button
            onClick={handleCancelSession}
            disabled={anyPending}
            className="rounded-md border border-red-300 bg-transparent px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelPending ? 'Cancelling…' : 'Cancel Session'}
          </button>
        </div>
        {recurringScheduleId && cancelSeriesAction && (
          <div className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.97]">
            <button
              onClick={handleCancelSeries}
              disabled={anyPending}
              className="rounded-md border border-red-300 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelSeriesPending ? 'Cancelling Series…' : 'Cancel Series'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
