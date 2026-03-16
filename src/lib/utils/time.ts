/**
 * Time utility functions for 5-minute granularity availability scheduling.
 *
 * Pure functions — no side effects, no runtime dependencies.
 * Consumed by AvailabilityEditor (S01/T03) and override editor (S02).
 */

/**
 * Generate 288 HH:MM strings from "00:00" to "23:55" in 5-minute increments.
 */
export function generate5MinOptions(): string[] {
  return Array.from({ length: 288 }, (_, i) => {
    const hours = Math.floor(i / 12)
    const minutes = (i % 12) * 5
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  })
}

/**
 * Convert a 24-hour "HH:MM" string to 12-hour "h:MM AM/PM" display format.
 *
 * Examples:
 *   "00:00" → "12:00 AM"
 *   "12:00" → "12:00 PM"
 *   "15:30" → "3:30 PM"
 *   "08:05" → "8:05 AM"
 */
export function formatTimeLabel(hhmm: string): string {
  const [hourStr, minuteStr] = hhmm.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr // already zero-padded from generate5MinOptions

  const period = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour

  return `${displayHour}:${minute} ${period}`
}

export interface TimeWindow {
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate that a set of time windows has no overlaps and each window's
 * end_time is strictly after its start_time.
 *
 * - Empty array → valid
 * - Adjacent (touching) windows are OK: 08:00–10:00 + 10:00–12:00 → valid
 * - Overlapping windows are rejected: 08:00–10:00 + 09:00–11:00 → invalid
 * - end_time <= start_time → invalid
 *
 * Sorts a copy internally — input order does not matter.
 */
export function validateNoOverlap(windows: TimeWindow[]): ValidationResult {
  if (windows.length === 0) {
    return { valid: true }
  }

  // Check each window has end > start
  for (const w of windows) {
    if (w.end_time <= w.start_time) {
      return {
        valid: false,
        error: `Invalid window: end time ${w.end_time} must be after start time ${w.start_time}`,
      }
    }
  }

  if (windows.length === 1) {
    return { valid: true }
  }

  // Sort a copy by start_time (lexicographic comparison works for HH:MM)
  const sorted = [...windows].sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Check for overlaps: current end_time must be <= next start_time
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end_time > sorted[i + 1].start_time) {
      return {
        valid: false,
        error: `Overlap detected: window ${sorted[i].start_time}–${sorted[i].end_time} overlaps with ${sorted[i + 1].start_time}–${sorted[i + 1].end_time}`,
      }
    }
  }

  return { valid: true }
}
