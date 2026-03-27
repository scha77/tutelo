'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SessionType {
  id: string
  label: string
  price: number
  duration_minutes: number
  sort_order: number
}

export async function createSessionType(formData: {
  label: string
  price: number
  duration_minutes: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!teacher) return { error: 'Teacher not found' }

  // Get max sort_order for this teacher
  const { data: existing } = await supabase
    .from('session_types')
    .select('sort_order')
    .eq('teacher_id', teacher.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from('session_types')
    .insert({
      teacher_id: teacher.id,
      label: formData.label,
      price: formData.price,
      duration_minutes: formData.duration_minutes,
      sort_order: nextSort,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateSessionType(
  id: string,
  formData: { label: string; price: number; duration_minutes: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!teacher) return { error: 'Teacher not found' }

  // Verify ownership
  const { data: existing } = await supabase
    .from('session_types')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (!existing || existing.teacher_id !== teacher.id) {
    return { error: 'Session type not found or not owned by you' }
  }

  const { error } = await supabase
    .from('session_types')
    .update({
      label: formData.label,
      price: formData.price,
      duration_minutes: formData.duration_minutes,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteSessionType(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!teacher) return { error: 'Teacher not found' }

  // Verify ownership
  const { data: existing } = await supabase
    .from('session_types')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (!existing || existing.teacher_id !== teacher.id) {
    return { error: 'Session type not found or not owned by you' }
  }

  const { error } = await supabase
    .from('session_types')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
