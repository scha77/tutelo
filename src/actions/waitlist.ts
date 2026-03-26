'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeWaitlistEntry(
  entryId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (teacherError || !teacher) return { error: 'Teacher not found' }

  const { count, error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', entryId)
    .eq('teacher_id', teacher.id)

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Entry not found or already removed' }

  revalidatePath('/dashboard/waitlist')
  return { success: true }
}
