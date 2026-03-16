'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const AvailabilitySlotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
}).refine(
  (s) => s.end_time > s.start_time,
  { message: 'End time must be after start time' }
)

const UpdateAvailabilitySchema = z.array(AvailabilitySlotSchema)

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
