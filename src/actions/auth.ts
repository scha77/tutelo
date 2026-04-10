'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/rate-limit'

export async function signUp(formData: FormData): Promise<{ error: string } | void> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = await checkLimit(ip, 'auth', { max: 10, window: '1 m' })
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string | null

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectTo ?? '/onboarding')
}

export async function signIn(formData: FormData): Promise<{ error: string } | void> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = await checkLimit(ip, 'auth', { max: 10, window: '1 m' })
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string | null

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // If a redirectTo was provided (e.g. parent returning to /account), use it
  if (redirectTo) {
    redirect(redirectTo)
  }

  const userId = data.user?.id
  if (userId) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (teacher) {
      redirect('/dashboard')
    }
  }

  redirect('/parent')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
