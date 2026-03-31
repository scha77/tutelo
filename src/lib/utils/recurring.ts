/**
 * Recurring booking utilities.
 *
 * Pure functions for generating recurring date series and checking
 * date conflicts against existing bookings and teacher availability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generate a series of YYYY-MM-DD date strings for recurring sessions.
 *
 * Pure function — no external dependencies.
 *
 * @param startDate  First session date in YYYY-MM-DD format
 * @param frequency  'weekly' (7-day interval) or 'biweekly' (14-day interval)
 * @param count      Number of sessions to generate (2–26)
 * @returns Array of YYYY-MM-DD date strings
 */
export function generateRecurringDates(
  startDate: string,
  frequency: 'weekly' | 'biweekly',
  count: number
): string[] {
  const intervalDays = frequency === 'weekly' ? 7 : 14
  const dates: string[] = []

  // Parse startDate as local-date (noon UTC avoids DST edge cases)
  const [year, month, day] = startDate.split('-').map(Number)
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * intervalDays * 24 * 60 * 60 * 1000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${dd}`)
  }

  return dates
}

export interface ConflictResult {
  available: string[]
  skipped: { date: string; reason: string }[]
}

/**
 * Check a list of candidate dates for booking conflicts and availability gaps.
 *
 * A date is skipped if:
 *   (a) An existing non-cancelled booking occupies the teacher's slot on that date, OR
 *   (b) The teacher has no availability window covering startTime–endTime on that date
 *       (checked via recurring availability + overrides, with override-wins precedence).
 *
 * @param teacherId  Teacher UUID
 * @param dates      Array of YYYY-MM-DD candidate dates
 * @param startTime  Slot start in HH:MM format (teacher timezone)
 * @param endTime    Slot end in HH:MM format (teacher timezone)
 * @param supabase   Supabase client (admin or service role)
 * @returns Promise with available dates and skipped dates with reasons
 */
export async function checkDateConflicts(
  teacherId: string,
  dates: string[],
  startTime: string,
  endTime: string,
  supabase: SupabaseClient
): Promise<ConflictResult> {
  if (dates.length === 0) {
    return { available: [], skipped: [] }
  }

  // 1. Fetch existing bookings for this teacher on any of the candidate dates
  //    that overlap the requested time slot and are not cancelled.
  const { data: existingBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('booking_date, start_time')
    .eq('teacher_id', teacherId)
    .in('booking_date', dates)
    .eq('start_time', startTime)
    .neq('status', 'cancelled')

  if (bookingsError) {
    console.error('[recurring] Failed to query bookings:', bookingsError.message)
    // On query failure, treat all dates as available (optimistic — will fail at insert with unique constraint)
    return { available: [...dates], skipped: [] }
  }

  const bookedDates = new Set(
    (existingBookings ?? []).map((b: { booking_date: string }) => b.booking_date)
  )

  // 2. Fetch recurring availability for this teacher (all days)
  const { data: recurringSlots, error: slotsError } = await supabase
    .from('availability')
    .select('day_of_week, start_time, end_time')
    .eq('teacher_id', teacherId)

  if (slotsError) {
    console.error('[recurring] Failed to query availability:', slotsError.message)
    return { available: [...dates], skipped: [] }
  }

  // 3. Fetch availability overrides for candidate dates
  const { data: overrides, error: overridesError } = await supabase
    .from('availability_overrides')
    .select('specific_date, start_time, end_time')
    .eq('teacher_id', teacherId)
    .in('specific_date', dates)

  if (overridesError) {
    console.error('[recurring] Failed to query overrides:', overridesError.message)
    // Continue without overrides
  }

  const overridesByDate = new Map<string, Array<{ start_time: string; end_time: string }>>()
  for (const o of overrides ?? []) {
    const existing = overridesByDate.get(o.specific_date) ?? []
    existing.push({ start_time: o.start_time, end_time: o.end_time })
    overridesByDate.set(o.specific_date, existing)
  }

  const available: string[] = []
  const skipped: { date: string; reason: string }[] = []

  for (const date of dates) {
    // Check booking conflict first
    if (bookedDates.has(date)) {
      skipped.push({ date, reason: 'already booked' })
      continue
    }

    // Check availability using override-wins-recurring precedence
    const hasAvailability = dateHasAvailability(
      date,
      startTime,
      endTime,
      recurringSlots ?? [],
      overridesByDate
    )

    if (!hasAvailability) {
      skipped.push({ date, reason: 'not available' })
      continue
    }

    available.push(date)
  }

  return { available, skipped }
}

/**
 * Check if a teacher has availability covering the requested time window
 * on a specific date. Uses override-wins-recurring precedence.
 *
 * @returns true if at least one availability window covers startTime–endTime
 */
function dateHasAvailability(
  dateStr: string,
  startTime: string,
  endTime: string,
  recurringSlots: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  overridesByDate: Map<string, Array<{ start_time: string; end_time: string }>>
): boolean {
  const matchingOverrides = overridesByDate.get(dateStr)

  if (matchingOverrides !== undefined) {
    // Override-wins: only check override windows (empty array = blocked day)
    return matchingOverrides.some((o) =>
      timeWindowCovers(o.start_time, o.end_time, startTime, endTime)
    )
  }

  // Fall back to recurring availability for this day-of-week
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const dayOfWeek = d.getUTCDay()

  const matchingSlots = recurringSlots.filter((s) => s.day_of_week === dayOfWeek)
  return matchingSlots.some((s) =>
    timeWindowCovers(s.start_time, s.end_time, startTime, endTime)
  )
}

/**
 * Check if an availability window (windowStart–windowEnd) fully covers
 * the requested slot (slotStart–slotEnd).
 *
 * Times are compared as HH:MM strings (lexicographic comparison works for 24h format).
 * DB may return HH:MM:SS — we normalize to HH:MM for comparison.
 */
function timeWindowCovers(
  windowStart: string,
  windowEnd: string,
  slotStart: string,
  slotEnd: string
): boolean {
  const ws = windowStart.slice(0, 5)
  const we = windowEnd.slice(0, 5)
  const ss = slotStart.slice(0, 5)
  const se = slotEnd.slice(0, 5)

  return ws <= ss && we >= se
}
