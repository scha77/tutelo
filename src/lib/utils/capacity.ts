import type { SupabaseClient } from '@supabase/supabase-js'

export interface CapacityStatus {
  atCapacity: boolean
  activeStudentCount: number
}

/**
 * Pure logic: given a student count and an optional capacity limit,
 * determine whether the teacher is at capacity.
 *
 * A null/undefined limit means unlimited — never at capacity.
 */
export function isAtCapacity(
  activeStudentCount: number,
  capacityLimit: number | null | undefined
): boolean {
  if (capacityLimit == null) return false
  return activeStudentCount >= capacityLimit
}

/**
 * Query the bookings table to count distinct active students for a teacher
 * in the last 90 days, then determine capacity status.
 *
 * "Active student" = distinct student_name with at least one booking
 * where status is 'confirmed' or 'completed' and booking_date is within
 * the last 90 days.
 *
 * If capacityLimit is null/undefined, short-circuits without querying
 * (the teacher has no cap).
 */
export async function getCapacityStatus(
  supabase: SupabaseClient,
  teacherId: string,
  capacityLimit: number | null | undefined
): Promise<CapacityStatus> {
  // Short-circuit: no limit means never at capacity
  if (capacityLimit == null) {
    return { atCapacity: false, activeStudentCount: 0 }
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD

  const { data, error } = await supabase
    .from('bookings')
    .select('student_name')
    .eq('teacher_id', teacherId)
    .in('status', ['confirmed', 'completed'])
    .gte('booking_date', cutoffDate)

  if (error) {
    // On query failure, assume not at capacity (safe default per slice plan)
    console.error(
      `[capacity] Failed to query bookings for teacher_id=${teacherId}:`,
      error.message
    )
    return { atCapacity: false, activeStudentCount: 0 }
  }

  // Count distinct student names
  const uniqueStudents = new Set(
    (data ?? []).map((row: { student_name: string }) => row.student_name)
  )
  const activeStudentCount = uniqueStudents.size

  return {
    atCapacity: isAtCapacity(activeStudentCount, capacityLimit),
    activeStudentCount,
  }
}
