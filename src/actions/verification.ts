'use server'

import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  generateVerificationToken,
  sendVerificationEmail,
} from '@/lib/verification'

/**
 * Request school email verification.
 * Generates a token, writes it to the teacher's DB row, and sends the verification email.
 * One pending token at a time — re-submitting overwrites the previous token.
 */
export async function requestSchoolEmailVerification(
  email: string
): Promise<{ error?: string }> {
  // Auth: session-based, uses getUser() per knowledge doc
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Validate email format
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) return { error: 'Invalid email address' }

  // Generate token + 24h expiry
  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Look up teacher
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!teacher) return { error: 'Teacher not found' }

  // Write token to DB (overwrites any previous pending token)
  const { error: updateError } = await supabase
    .from('teachers')
    .update({
      school_email_verification_token: token,
      school_email_verification_expires_at: expiresAt,
    })
    .eq('id', teacher.id)
  if (updateError) return { error: 'Failed to save verification token' }

  // Send verification email
  try {
    await sendVerificationEmail(email, token)
  } catch (err) {
    Sentry.captureException(err)
    console.error('[verification] Failed to send verification email:', err)
    return { error: 'Failed to send verification email' }
  }

  revalidatePath('/dashboard/settings')
  return {}
}
