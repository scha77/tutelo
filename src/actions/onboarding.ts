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

  // Check if teacher row already exists
  const { data: existing } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    // First save (step 1) — INSERT requires all NOT NULL columns without defaults
    // Auto-generate slug from full_name since it's required
    const slug = data.full_name
      ? await findUniqueSlug(data.full_name, supabase)
      : 'teacher'

    // Auto-populate social_email from auth email so new teachers receive
    // booking notifications even if they never visit Page Settings.
    // Works for both email/password and Google OAuth signup.
    let authEmail: string | null = null
    try {
      const { data: userData } = await supabase.auth.getUser()
      authEmail = userData?.user?.email ?? null
    } catch {
      // getUser() failure is non-critical — fall back to null (same as prior behavior)
    }

    const { error } = await supabase.from('teachers').insert({
      user_id: userId,
      slug,
      full_name: data.full_name ?? '',
      wizard_step: step,
      ...data,
      // Auto-set social_email from auth email (social_email is not in FullOnboardingData,
      // so it won't come from the wizard — auth email is always the right default here)
      social_email: authEmail,
    })
    if (error) return { error: error.message }
  } else {
    // Row exists — safe to UPDATE only the provided columns
    const { error } = await supabase
      .from('teachers')
      .update({ wizard_step: step, ...data })
      .eq('user_id', userId)
    if (error) return { error: error.message }
  }

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
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed' }
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
