import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { isTokenExpired } from '@/lib/verification'
import { checkLimit } from '@/lib/rate-limit'

/**
 * GET /api/verify-email?token=<uuid>
 *
 * Handles the email verification link click.
 * Uses supabaseAdmin (service role) because the teacher may click the link
 * in a different browser where they have no session.
 *
 * On success: stamps verified_at, clears token columns, redirects to settings with ?verified=true
 * On failure: redirects to settings with ?error=invalid or ?error=expired
 */
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = await checkLimit(ip, 'verify-email', { max: 5, window: '1 m' })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  // No token provided
  if (!token) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=invalid', request.url)
    )
  }

  // Look up teacher by token
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, school_email_verification_expires_at')
    .eq('school_email_verification_token', token)
    .maybeSingle()

  if (!teacher) {
    console.warn('[verify-email] Token not found:', token)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=invalid', request.url)
    )
  }

  // Check expiry
  if (isTokenExpired(teacher.school_email_verification_expires_at)) {
    console.warn('[verify-email] Token expired for teacher:', teacher.id)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=expired', request.url)
    )
  }

  // Stamp verified_at and clear token columns
  const { error: updateError } = await supabaseAdmin
    .from('teachers')
    .update({
      verified_at: new Date().toISOString(),
      school_email_verification_token: null,
      school_email_verification_expires_at: null,
    })
    .eq('id', teacher.id)

  if (updateError) {
    console.error('[verify-email] Failed to update teacher:', updateError)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=invalid', request.url)
    )
  }

  return NextResponse.redirect(
    new URL('/dashboard/settings?verified=true', request.url)
  )
}
