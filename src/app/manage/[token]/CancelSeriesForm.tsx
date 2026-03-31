'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Session {
  id: string
  student_name: string
  subject: string
  booking_date: string
  start_time: string
  status: string
}

interface CancelSeriesFormProps {
  sessions: Session[]
  token: string
  teacherName: string
}

export function CancelSeriesForm({ sessions: initialSessions, token, teacherName }: CancelSeriesFormProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancellingAll, setCancellingAll] = useState(false)

  // All sessions cancelled — completion state
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-green-800 font-medium">
          All sessions have been cancelled.
        </p>
        <p className="text-green-700 text-sm mt-1">
          You and {teacherName} will receive confirmation emails shortly.
        </p>
      </div>
    )
  }

  async function handleCancelSession(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this session? This cannot be undone.')) {
      return
    }

    setCancellingId(bookingId)
    try {
      const res = await fetch('/api/manage/cancel-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel session')
        return
      }

      toast.success('Session cancelled')
      setSessions((prev) => prev.filter((s) => s.id !== bookingId))
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  async function handleCancelAll() {
    if (
      !confirm(
        `Are you sure you want to cancel all ${sessions.length} remaining session${sessions.length > 1 ? 's' : ''}? This cannot be undone.`
      )
    ) {
      return
    }

    setCancellingAll(true)
    try {
      const res = await fetch('/api/manage/cancel-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel series')
        return
      }

      toast.success(`${data.cancelledCount} session${data.cancelledCount > 1 ? 's' : ''} cancelled`)
      setSessions([])
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCancellingAll(false)
    }
  }

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTime(time: string) {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Confirmed
          </span>
        )
      case 'payment_failed':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Payment Failed
          </span>
        )
      case 'requested':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Requested
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {sessions.length} upcoming session{sessions.length > 1 ? 's' : ''}
      </p>

      <div className="divide-y rounded-lg border">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {formatDate(session.booking_date)}
                </span>
                <span className="text-muted-foreground text-sm">
                  {formatTime(session.start_time)}
                </span>
                {statusLabel(session.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {session.student_name} · {session.subject}
              </p>
            </div>
            <button
              onClick={() => handleCancelSession(session.id)}
              disabled={cancellingId === session.id || cancellingAll}
              className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancellingId === session.id ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleCancelAll}
        disabled={cancellingAll || cancellingId !== null}
        className="w-full rounded-md bg-red-600 text-white py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
      >
        {cancellingAll
          ? 'Cancelling all…'
          : `Cancel All ${sessions.length} Remaining Session${sessions.length > 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
