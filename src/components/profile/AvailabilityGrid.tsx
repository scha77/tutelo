'use client'

import { useMemo } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { toDate } from 'date-fns-tz'
import { addDays } from 'date-fns'

interface AvailabilitySlot {
  id: string
  teacher_id: string
  day_of_week: number // 0=Sun
  start_time: string  // "HH:MM"
  end_time: string    // "HH:MM"
}

interface AvailabilityGridProps {
  slots: AvailabilitySlot[]
  teacherTimezone: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Reference Monday 2025-01-13 for stable date math
const REFERENCE_MONDAY = new Date(2025, 0, 13)

interface ConvertedSlot {
  startDisplay: string
  endDisplay: string
  dayOfWeek: number
}

function convertSlot(
  slot: AvailabilitySlot,
  fromTimezone: string,
  toTimezone: string
): ConvertedSlot {
  const dayOffset = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1
  const referenceDay = addDays(REFERENCE_MONDAY, dayOffset)

  const year = referenceDay.getFullYear()
  const month = String(referenceDay.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDay.getDate()).padStart(2, '0')

  const startDate = toDate(
    `${year}-${month}-${day}T${slot.start_time}:00`,
    { timeZone: fromTimezone }
  )
  const endDate = toDate(
    `${year}-${month}-${day}T${slot.end_time}:00`,
    { timeZone: fromTimezone }
  )

  const startDisplay = formatInTimeZone(startDate, toTimezone, 'h:mm a')
  const endDisplay = formatInTimeZone(endDate, toTimezone, 'h:mm a')

  // Determine actual day of week in visitor timezone
  const visitorDayNum = parseInt(formatInTimeZone(startDate, toTimezone, 'i'), 10) % 7
  // date-fns 'i' returns 1=Mon..7=Sun, convert to 0=Sun..6=Sat
  const isoDay = parseInt(formatInTimeZone(startDate, toTimezone, 'i'), 10)
  const convertedDayOfWeek = isoDay === 7 ? 0 : isoDay

  return { startDisplay, endDisplay, dayOfWeek: convertedDayOfWeek }
}

export function AvailabilityGrid({ slots, teacherTimezone }: AvailabilityGridProps) {
  const visitorTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return teacherTimezone
    }
  }, [teacherTimezone])

  const convertedSlots = useMemo(() => {
    return slots.map((slot) => convertSlot(slot, teacherTimezone, visitorTimezone))
  }, [slots, teacherTimezone, visitorTimezone])

  // Group by day of week (0=Sun..6=Sat)
  const slotsByDay = useMemo(() => {
    const map = new Map<number, ConvertedSlot[]>()
    for (let d = 0; d < 7; d++) map.set(d, [])
    for (const slot of convertedSlots) {
      map.get(slot.dayOfWeek)?.push(slot)
    }
    return map
  }, [convertedSlots])

  const timezoneLabel = visitorTimezone.replace(/_/g, ' ')

  return (
    <section id="availability" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-sm text-muted-foreground">
          Times shown in {timezoneLabel}
        </p>
      </div>

      {slots.length === 0 ? (
        <p className="text-muted-foreground">No availability set yet.</p>
      ) : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden grid-cols-7 gap-2 md:grid">
            {DAYS.map((dayName, dayIdx) => {
              const daySlots = slotsByDay.get(dayIdx) ?? []
              return (
                <div key={dayName} className="min-w-0">
                  <div className="mb-1 text-center text-xs font-medium text-muted-foreground">
                    {dayName}
                  </div>
                  {daySlots.length === 0 ? (
                    <div className="rounded-md bg-muted/30 py-1 text-center text-xs text-muted-foreground">
                      —
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {daySlots.map((s, i) => (
                        <div
                          key={i}
                          className="rounded-md px-1 py-1 text-center text-xs"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                            color: 'var(--accent)',
                          }}
                        >
                          {s.startDisplay}
                          <br />
                          <span className="opacity-70">{s.endDisplay}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile: stacked list */}
          <div className="space-y-3 md:hidden">
            {DAYS.map((dayName, dayIdx) => {
              const daySlots = slotsByDay.get(dayIdx) ?? []
              if (daySlots.length === 0) return null
              return (
                <div key={dayName} className="flex items-start gap-3">
                  <div className="w-10 flex-shrink-0 pt-0.5 text-sm font-medium">
                    {dayName}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {daySlots.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md px-2 py-1 text-xs"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: 'var(--accent)',
                        }}
                      >
                        {s.startDisplay}–{s.endDisplay}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
