import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { isBot } from '@/lib/utils/bot-filter'
import { checkLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkLimit(ip, 'track-view', { max: 30, window: '1 m' })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const teacherId = body?.teacherId

    if (!teacherId || typeof teacherId !== 'string') {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent')
    const bot = isBot(userAgent)

    const { error } = await supabaseAdmin.from('page_views').insert({
      teacher_id: teacherId,
      user_agent: userAgent,
      is_bot: bot,
    })

    if (error) {
      console.error('[track-view] insert error', { teacherId, error: error.message })
      return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    Sentry.captureException(err)
    console.error('[track-view] unexpected error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
