'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData): Promise<{ error: string } | void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/onboarding')
}

export async function signIn(formData: FormData): Promise<{ error: string } | void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const userId = data.user?.id
  if (userId) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('is_published')
      .eq('user_id', userId)
      .maybeSingle()

    if (teacher?.is_published) {
      redirect('/dashboard')
    }
  }

  redirect('/onboarding')
}
