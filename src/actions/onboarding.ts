'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FullOnboardingSchema, type FullOnboardingData } from '@/lib/schemas/onboarding'
import { findUniqueSlug } from '@/lib/utils/slugify'

// Get the authenticated user's ID via getClaims
async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}

// Save wizard progress after each step (upsert to teachers table)
export async function saveWizardStep(
  step: number,
  data: Partial<FullOnboardingData>
): Promise<{ error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('teachers')
    .upsert(
      {
        user_id: userId,
        wizard_step: step,
        ...data,
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}

// Auto-generate a unique slug from the teacher's name
export async function generateSlugAction(
  name: string
): Promise<{ slug: string }> {
  const supabase = await createClient()
  const slug = await findUniqueSlug(name, supabase)
  return { slug }
}

// Final publish: validate all data, upsert teacher row with is_published=true,
// delete + re-insert availability rows, then redirect to /dashboard?welcome=true
export async function publishProfile(
  data: FullOnboardingData
): Promise<{ error?: string; slug?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  // Validate full data against schema
  const parsed = FullOnboardingSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Validation failed' }
  }

  const { availability, ...teacherFields } = parsed.data

  const supabase = await createClient()

  // Upsert teacher row with is_published=true
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .upsert(
      {
        user_id: userId,
        ...teacherFields,
        is_published: true,
        wizard_step: 3,
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single()

  if (teacherError || !teacher) {
    return { error: teacherError?.message ?? 'Failed to save profile' }
  }

  const teacherId = teacher.id

  // Delete existing availability rows for this teacher
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('teacher_id', teacherId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Insert new availability rows
  const availabilityRows = availability.map((slot) => ({
    teacher_id: teacherId,
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
  }))

  const { error: insertError } = await supabase
    .from('availability')
    .insert(availabilityRows)

  if (insertError) {
    return { error: insertError.message }
  }

  redirect('/dashboard?welcome=true')
}
