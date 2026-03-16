'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { validateNoOverlap } from '@/lib/utils/time'

const AvailabilitySlotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
}).refine(
  (s) => s.end_time > s.start_time,
  { message: 'End time must be after start time' }
)

const UpdateAvailabilitySchema = z.array(AvailabilitySlotSchema)

// ── Override schemas ───────────────────────────────────────────────────

const OverrideWindowSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (expected HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (expected HH:MM)'),
}).refine(
  (s) => s.end_time > s.start_time,
  { message: 'End time must be after start time' }
)

const SpecificDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Invalid date format (expected YYYY-MM-DD)'
)

async function getTeacherId(userId: string, supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never): Promise<string | null> {
  const { data } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function updateAvailability(
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const parsed = UpdateAvailabilitySchema.safeParse(slots)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid slot data' }
  }

  const teacherId = await getTeacherId(userId, supabase)
  if (!teacherId) return { error: 'Teacher profile not found' }

  // Delete all existing availability for this teacher
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('teacher_id', teacherId)

  if (deleteError) return { error: deleteError.message }

  // Insert new slots (skip if empty — valid to have no availability)
  if (parsed.data.length > 0) {
    const rows = parsed.data.map((slot) => ({
      teacher_id: teacherId,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
    }))

    const { error: insertError } = await supabase
      .from('availability')
      .insert(rows)

    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/dashboard/availability')
  revalidatePath('/[slug]', 'page')

  return {}
}

// ── Override server actions ────────────────────────────────────────────

/**
 * Save override availability for a specific date.
 * Uses delete-then-insert pattern: all existing overrides for the
 * (teacher_id, specific_date) pair are removed first.
 *
 * Empty windows array = "unavailable on this date" (rows deleted, none inserted).
 */
export async function saveOverrides(
  specificDate: string,
  windows: Array<{ start_time: string; end_time: string }>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  // Validate date format
  const dateParsed = SpecificDateSchema.safeParse(specificDate)
  if (!dateParsed.success) {
    return { error: dateParsed.error.issues[0]?.message ?? 'Invalid date format' }
  }

  // Validate each window
  const parsedWindows = z.array(OverrideWindowSchema).safeParse(windows)
  if (!parsedWindows.success) {
    return { error: parsedWindows.error.issues[0]?.message ?? 'Invalid time window' }
  }

  // Validate no overlaps among windows
  if (parsedWindows.data.length > 0) {
    const overlapResult = validateNoOverlap(parsedWindows.data)
    if (!overlapResult.valid) {
      return { error: overlapResult.error! }
    }
  }

  const teacherId = await getTeacherId(userId, supabase)
  if (!teacherId) return { error: 'Teacher profile not found' }

  // Delete all existing overrides for this teacher + date
  const { error: deleteError } = await supabase
    .from('availability_overrides')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('specific_date', specificDate)

  if (deleteError) return { error: `Delete failed: ${deleteError.message}` }

  // Insert new windows (skip if empty — means "unavailable on this date")
  if (parsedWindows.data.length > 0) {
    const rows = parsedWindows.data.map((w) => ({
      teacher_id: teacherId,
      specific_date: specificDate,
      start_time: w.start_time,
      end_time: w.end_time,
    }))

    const { error: insertError } = await supabase
      .from('availability_overrides')
      .insert(rows)

    if (insertError) return { error: `Insert failed: ${insertError.message}` }
  }

  revalidatePath('/dashboard/availability')
  revalidatePath('/[slug]', 'page')

  return {}
}

/**
 * Delete all overrides for a specific date, reverting to recurring behavior.
 * Distinct from saveOverrides with empty windows (which means "unavailable").
 */
export async function deleteOverridesForDate(
  specificDate: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const dateParsed = SpecificDateSchema.safeParse(specificDate)
  if (!dateParsed.success) {
    return { error: dateParsed.error.issues[0]?.message ?? 'Invalid date format' }
  }

  const teacherId = await getTeacherId(userId, supabase)
  if (!teacherId) return { error: 'Teacher profile not found' }

  const { error: deleteError } = await supabase
    .from('availability_overrides')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('specific_date', specificDate)

  if (deleteError) return { error: `Delete failed: ${deleteError.message}` }

  revalidatePath('/dashboard/availability')
  revalidatePath('/[slug]', 'page')

  return {}
}
