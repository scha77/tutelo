/**
 * Slot generation utilities for booking calendar.
 *
 * Pure functions — extracted from BookingCalendar.tsx for testability.
 * Implements override-wins-recurring precedence:
 *   1. If any override row matches the date → return only override-derived slots
 *   2. If override rows exist for the date but have zero windows → return empty array
 *   3. Otherwise → fall back to recurring slots for that day-of-week
 */

import { formatInTimeZone, toDate } from 'date-fns-tz'

export interface AvailabilitySlot {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string // DB returns "HH:MM:SS"
  end_time: string
}

export interface AvailabilityOverride {
  specific_date: string // "YYYY-MM-DD"
  start_time: string    // "HH:MM" or "HH:MM:SS"
  end_time: string      // "HH:MM" or "HH:MM:SS"
}

export interface TimeSlot {
  slotId: string
  startDisplay: string
  endDisplay: string
  startRaw: string // "HH:MM" — teacher-timezone time for DB storage
  endRaw: string   // "HH:MM" — teacher-timezone time for DB storage
}

/**
 * Generate display time slots for a given date.
 *
 * Override-wins-recurring precedence:
 * - If `overrides` contains any row matching this date's "YYYY-MM-DD",
 *   return only override-derived slots (ignoring recurring).
 * - If overrides match but the array of matching rows is empty after filtering,
 *   return [] (explicitly "no availability" for this date).
 * - Otherwise, fall back to recurring `slots` for this date's day-of-week.
 *
 * @param date           The calendar date to generate slots for
 * @param slots          Recurring weekly availability slots
 * @param teacherTimezone IANA timezone of the teacher (e.g. "America/New_York")
 * @param visitorTimezone IANA timezone of the visitor
 * @param overrides      Optional per-date override availability
 */
export function getSlotsForDate(
  date: Date,
  slots: AvailabilitySlot[],
  teacherTimezone: string,
  visitorTimezone: string,
  overrides: AvailabilityOverride[] = []
): TimeSlot[] {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const now = new Date()

  // Check for override rows matching this date
  const matchingOverrides = overrides.filter((o) => o.specific_date === dateStr)

  if (matchingOverrides.length > 0) {
    // Override-wins: return only override-derived slots
    return matchingOverrides
      .flatMap((override) => {
        const startRaw = override.start_time.slice(0, 5)
        const endRaw = override.end_time.slice(0, 5)
        const startDate = toDate(`${dateStr}T${startRaw}:00`, { timeZone: teacherTimezone })
        if (startDate <= now) return [] // filter out past slots
        const endDate = toDate(`${dateStr}T${endRaw}:00`, { timeZone: teacherTimezone })
        return [{
          slotId: `${dateStr}-${startRaw}`,
          startDisplay: formatInTimeZone(startDate, visitorTimezone, 'h:mm a'),
          endDisplay: formatInTimeZone(endDate, visitorTimezone, 'h:mm a'),
          startRaw,
          endRaw,
        }]
      })
      .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
  }

  // No overrides for this date — fall back to recurring slots
  const dayOfWeek = date.getDay()
  const matching = slots.filter((s) => s.day_of_week === dayOfWeek)

  return matching
    .flatMap((slot) => {
      const startRaw = slot.start_time.slice(0, 5)
      const endRaw = slot.end_time.slice(0, 5)
      const startDate = toDate(`${dateStr}T${startRaw}:00`, { timeZone: teacherTimezone })
      if (startDate <= now) return [] // filter out past slots
      const endDate = toDate(`${dateStr}T${endRaw}:00`, { timeZone: teacherTimezone })
      return [{
        slotId: slot.id,
        startDisplay: formatInTimeZone(startDate, visitorTimezone, 'h:mm a'),
        endDisplay: formatInTimeZone(endDate, visitorTimezone, 'h:mm a'),
        startRaw,
        endRaw,
      }]
    })
    .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
}
