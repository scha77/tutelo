import { formatInTimeZone } from 'date-fns-tz'
import { addDays, setHours, setMinutes, nextDay, isSameDay } from 'date-fns'

export interface AvailabilitySlotInput {
  id: string
  teacher_id: string
  day_of_week: number // 0=Sun
  start_time: string  // "HH:MM"
  end_time: string    // "HH:MM"
}

export interface ConvertedSlot {
  startDisplay: string
  endDisplay: string
  dayOffset: number // 0 = same day, 1 = next day, -1 = prev day
}

/**
 * Get the visitor's local timezone from the browser.
 * Returns a best-guess IANA timezone string.
 */
export function getVisitorTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Convert an availability slot from teacher timezone to visitor timezone.
 * Uses a fixed reference date (2025-01-15 = Wednesday, day_of_week=3) to
 * anchor calculations and avoid flakiness from "current date" math.
 */
export function convertSlotToTimezone(
  slot: AvailabilitySlotInput,
  fromTimezone: string,
  toTimezone: string
): ConvertedSlot {
  // Build a reference date anchored to a fixed Monday (2025-01-13)
  // so that day_of_week 0=Sun maps to 2025-01-12, day 1=Mon to 2025-01-13, etc.
  // Reference Monday: 2025-01-13
  const REFERENCE_MONDAY = new Date(2025, 0, 13) // Jan 13 2025 (Monday, local midnight)

  // Offset from Monday: Sun=-1 (or +6), Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5
  const dayOffset = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1
  const referenceDay = addDays(REFERENCE_MONDAY, dayOffset)

  // Parse start and end times
  const [startHour, startMin] = slot.start_time.split(':').map(Number)
  const [endHour, endMin] = slot.end_time.split(':').map(Number)

  // Build UTC-correct Date objects in the fromTimezone.
  // We use formatInTimeZone on a UTC date constructed so that
  // when displayed in fromTimezone it shows the desired HH:MM.
  // Easier approach: use a UTC timestamp for the date and apply time.
  // Create a date string in ISO-like format interpreted as fromTimezone:
  const year = referenceDay.getFullYear()
  const month = String(referenceDay.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDay.getDate()).padStart(2, '0')
  const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
  const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

  // Parse the date-time string as if it's in fromTimezone using date-fns-tz
  const { toDate } = require('date-fns-tz') as typeof import('date-fns-tz')
  const startDate = toDate(`${year}-${month}-${day}T${startTimeStr}:00`, { timeZone: fromTimezone })
  const endDate = toDate(`${year}-${month}-${day}T${endTimeStr}:00`, { timeZone: fromTimezone })

  // Format in visitor's timezone
  const startDisplay = formatInTimeZone(startDate, toTimezone, 'h:mm a')
  const endDisplay = formatInTimeZone(endDate, toTimezone, 'h:mm a')

  // Determine day offset: compare the day-of-week in the visitor's timezone vs source
  const visitorDayStr = formatInTimeZone(startDate, toTimezone, 'd')
  const sourceDayStr = `${referenceDay.getDate()}`

  // Compare day of month to determine if conversion crossed midnight
  const visitorDay = parseInt(visitorDayStr)
  const sourceDay = referenceDay.getDate()

  let computedDayOffset = 0
  if (visitorDay > sourceDay) {
    computedDayOffset = 1
  } else if (visitorDay < sourceDay) {
    // Could be month boundary — compare month too
    const visitorMonth = parseInt(formatInTimeZone(startDate, toTimezone, 'M'))
    const sourceMonth = referenceDay.getMonth() + 1
    if (visitorMonth === sourceMonth) {
      computedDayOffset = -1
    } else {
      // Month crossed — next day
      computedDayOffset = 1
    }
  }

  return {
    startDisplay,
    endDisplay,
    dayOffset: computedDayOffset,
  }
}
