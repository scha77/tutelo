import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!rateLimit(`waitlist:${ip}`, { maxRequests: 5, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { teacherId, email } = body

    // Validate required fields
    if (!teacherId || typeof teacherId !== 'string') {
      return NextResponse.json(
        { error: 'teacherId is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('waitlist')
      .insert({
        teacher_id: teacherId,
        parent_email: email.toLowerCase().trim(),
      })

    if (error) {
      // Unique constraint violation — already on waitlist
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'already_on_waitlist' },
          { status: 409 }
        )
      }

      // Log with teacher_id context but no PII (no email value)
      console.error('[waitlist] Insert failed', {
        teacher_id: teacherId,
        error_code: error.code,
        error_message: error.message,
      })

      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    console.error('[waitlist] Unexpected error in POST handler')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
