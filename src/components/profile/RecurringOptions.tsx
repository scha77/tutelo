'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, Check, X, CalendarDays, Loader2, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateRecurringDates } from '@/lib/utils/recurring'
import type { TimeSlot } from '@/lib/utils/slots'

export type RecurringFrequency = 'one-time' | 'weekly' | 'biweekly'

export interface RecurringConfirmData {
  frequency: RecurringFrequency
  count: number
  availableDates: string[]
  skippedDates: { date: string; reason: string }[]
}

interface RecurringOptionsProps {
  teacherId: string
  selectedDate: Date
  selectedSlot: TimeSlot
  subjects: string[]
  accentColor: string
  onConfirm: (data: RecurringConfirmData) => void
  onBack: () => void
}

/**
 * Recurring schedule picker rendered between the booking form and the auth/payment step.
 * Lets parent choose one-time (default), weekly, or biweekly with N sessions.
 * Shows projected dates with conflict annotations fetched from the check-conflicts endpoint.
 */
export function RecurringOptions({
  teacherId,
  selectedDate,
  selectedSlot,
  accentColor,
  onConfirm,
  onBack,
}: RecurringOptionsProps) {
  const [frequency, setFrequency] = useState<RecurringFrequency>('one-time')
  const [count, setCount] = useState(4)
  const [projectedDates, setProjectedDates] = useState<string[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [skippedDates, setSkippedDates] = useState<{ date: string; reason: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startDateStr = format(selectedDate, 'yyyy-MM-dd')

  // Generate projected dates and check conflicts whenever frequency/count change
  const checkConflicts = useCallback(async (dates: string[]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/direct-booking/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          dates,
          startTime: selectedSlot.startRaw,
          endTime: selectedSlot.endRaw,
        }),
      })
      if (!res.ok) {
        setError('Could not check availability. Please try again.')
        // Optimistic fallback: treat all as available
        setAvailableDates(dates)
        setSkippedDates([])
        return
      }
      const data = await res.json()
      setAvailableDates(data.available ?? dates)
      setSkippedDates(data.skipped ?? [])
    } catch {
      setError('Network error checking availability.')
      setAvailableDates(dates)
      setSkippedDates([])
    } finally {
      setLoading(false)
    }
  }, [teacherId, selectedSlot.startRaw, selectedSlot.endRaw])

  useEffect(() => {
    if (frequency === 'one-time') {
      setProjectedDates([])
      setAvailableDates([])
      setSkippedDates([])
      return
    }

    const freq = frequency as 'weekly' | 'biweekly'
    const dates = generateRecurringDates(startDateStr, freq, count)
    setProjectedDates(dates)
    checkConflicts(dates)
  }, [frequency, count, startDateStr, checkConflicts])

  function handleConfirm() {
    if (frequency === 'one-time') {
      onConfirm({ frequency: 'one-time', count: 1, availableDates: [], skippedDates: [] })
      return
    }
    onConfirm({ frequency, count, availableDates, skippedDates })
  }

  // Format a YYYY-MM-DD date string for display
  function formatDateDisplay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return format(dt, 'EEE, MMM d, yyyy')
  }

  const skippedSet = new Set(skippedDates.map((s) => s.date))
  const endDate = projectedDates.length > 0 ? projectedDates[projectedDates.length - 1] : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Back to form"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm text-muted-foreground leading-tight">
          <span className="font-medium text-foreground">
            {format(selectedDate, 'EEEE, MMMM d')}
          </span>
          <span>
            {' '}&middot; {selectedSlot.startDisplay} – {selectedSlot.endDisplay}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-md">
        {/* Frequency toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Schedule type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['one-time', 'weekly', 'biweekly'] as const).map((f) => {
              const labels: Record<RecurringFrequency, string> = {
                'one-time': 'One-time',
                weekly: 'Weekly',
                biweekly: 'Biweekly',
              }
              const isActive = frequency === f
              return (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={[
                    'rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive ? 'text-white' : 'hover:bg-muted/50',
                  ].join(' ')}
                  style={{
                    borderColor: isActive ? accentColor : undefined,
                    backgroundColor: isActive ? accentColor : undefined,
                  }}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Session count (only for recurring) */}
        {frequency !== 'one-time' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of sessions</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={26}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex-1 accent-current"
                style={{ accentColor }}
              />
              <span className="text-sm font-semibold w-8 text-right">{count}</span>
            </div>
            {endDate && (
              <p className="text-xs text-muted-foreground">
                Ends {formatDateDisplay(endDate)}
              </p>
            )}
          </div>
        )}

        {/* Projected dates list */}
        {frequency !== 'one-time' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Projected sessions</span>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {error && (
              <p className="text-xs text-amber-600">{error}</p>
            )}

            <div className="max-h-60 overflow-y-auto rounded-lg border divide-y">
              {projectedDates.map((date, i) => {
                const isSkipped = skippedSet.has(date)
                const skipInfo = skippedDates.find((s) => s.date === date)
                return (
                  <div
                    key={date}
                    className={[
                      'flex items-center justify-between px-3 py-2 text-sm',
                      isSkipped ? 'bg-muted/40 text-muted-foreground' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      {isSkipped ? (
                        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
                      )}
                      <span className={isSkipped ? 'line-through' : ''}>
                        {formatDateDisplay(date)}
                      </span>
                      {i === 0 && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          First
                        </span>
                      )}
                    </div>
                    {isSkipped && skipInfo && (
                      <span className="text-xs text-destructive">{skipInfo.reason}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            {!loading && projectedDates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {availableDates.length} session{availableDates.length !== 1 ? 's' : ''} will be booked
                {skippedDates.length > 0 && (
                  <span className="text-amber-600">
                    {' '}· {skippedDates.length} skipped
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          {frequency === 'one-time' ? (
            <Button
              onClick={handleConfirm}
              size="lg"
              className="w-full font-semibold"
              style={{ backgroundColor: accentColor, color: 'white' }}
            >
              Continue with one-time session
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              size="lg"
              disabled={loading || availableDates.length === 0}
              className="w-full font-semibold"
              style={{ backgroundColor: accentColor, color: 'white' }}
            >
              <Repeat className="h-4 w-4 mr-2" />
              {loading
                ? 'Checking availability…'
                : `Confirm ${availableDates.length} recurring session${availableDates.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
