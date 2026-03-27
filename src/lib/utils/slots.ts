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

const SLOT_DURATION_MS = 30 * 60 * 1000 // 30 minutes in milliseconds

/**
 * Expand a single availability window into 30-minute booking increment slots.
 *
 * Pure function — all time arithmetic uses UTC epoch math via `toDate()`.
 * Filters out past slots per 30-min increment (not per window).
 * Windows shorter than 30 minutes produce an empty array (no crash).
 *
 * @param dateStr         "YYYY-MM-DD" date string
 * @param startRaw        "HH:MM" start of the availability window (teacher timezone)
 * @param endRaw          "HH:MM" end of the availability window (teacher timezone)
 * @param now             Current time for past-slot filtering
 * @param teacherTimezone IANA timezone of the teacher
 * @param visitorTimezone IANA timezone of the visitor
 */
export function generateSlotsFromWindow(
  dateStr: string,
  startRaw: string,
  endRaw: string,
  now: Date,
  teacherTimezone: string,
  visitorTimezone: string,
  durationMinutes: number = 30
): TimeSlot[] {
  const windowStart = toDate(`${dateStr}T${startRaw}:00`, { timeZone: teacherTimezone })
  const windowEnd = toDate(`${dateStr}T${endRaw}:00`, { timeZone: teacherTimezone })
  const result: TimeSlot[] = []
  const slotDurationMs = durationMinutes * 60 * 1000

  let slotStart = windowStart.getTime()
  const endMs = windowEnd.getTime()

  while (slotStart + slotDurationMs <= endMs) {
    const slotStartDate = new Date(slotStart)
    const slotEndDate = new Date(slotStart + slotDurationMs)

    // Filter out past slots per increment
    if (slotStartDate > now) {
      const slotStartRaw = formatInTimeZone(slotStartDate, teacherTimezone, 'HH:mm')
      const slotEndRaw = formatInTimeZone(slotEndDate, teacherTimezone, 'HH:mm')

      result.push({
        slotId: `${dateStr}-${slotStartRaw}`,
        startDisplay: formatInTimeZone(slotStartDate, visitorTimezone, 'h:mm a'),
        endDisplay: formatInTimeZone(slotEndDate, visitorTimezone, 'h:mm a'),
        startRaw: slotStartRaw,
        endRaw: slotEndRaw,
      })
    }

    slotStart += SLOT_DURATION_MS // Always advance by 30-min increments for slot start options
  }

  return result
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
 * Each availability window is expanded into 30-minute booking increment slots
 * via `generateSlotsFromWindow()`.
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
  overrides: AvailabilityOverride[] = [],
  durationMinutes: number = 30
): TimeSlot[] {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const now = new Date()

  // Check for override rows matching this date
  const matchingOverrides = overrides.filter((o) => o.specific_date === dateStr)

  if (matchingOverrides.length > 0) {
    // Override-wins: return only override-derived slots (expanded to 30-min increments)
    return matchingOverrides
      .flatMap((override) => {
        const startRaw = override.start_time.slice(0, 5)
        const endRaw = override.end_time.slice(0, 5)
        return generateSlotsFromWindow(dateStr, startRaw, endRaw, now, teacherTimezone, visitorTimezone, durationMinutes)
      })
      .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
  }

  // No overrides for this date — fall back to recurring slots (expanded to 30-min increments)
  const dayOfWeek = date.getDay()
  const matching = slots.filter((s) => s.day_of_week === dayOfWeek)

  return matching
    .flatMap((slot) => {
      const startRaw = slot.start_time.slice(0, 5)
      const endRaw = slot.end_time.slice(0, 5)
      return generateSlotsFromWindow(dateStr, startRaw, endRaw, now, teacherTimezone, visitorTimezone, durationMinutes)
    })
    .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
}
