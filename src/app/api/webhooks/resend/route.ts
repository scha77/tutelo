import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { verifyResendWebhook, type ResendEventType } from '@/lib/webhooks/resend'

// Force Node runtime — Svix needs Buffer
export const runtime = 'nodejs'

// Events worth alerting on in Sentry (bounces + complaints = deliverability issues)
const ALERT_EVENTS: Set<ResendEventType> = new Set([
  'email.bounced',
  'email.complained',
  'email.delivery_delayed',
])

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 401 })
  }

  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  let event
  try {
    event = verifyResendWebhook(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }, secret)
  } catch (err) {
    console.warn('[resend-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // Only alert Sentry on deliverability issues — delivered/opened/clicked are too noisy
  if (ALERT_EVENTS.has(event.type)) {
    const recipients = event.data.to?.join(', ') ?? 'unknown'
    Sentry.captureMessage(
      `Resend ${event.type}: ${event.data.subject ?? '(no subject)'} → ${recipients}`,
      {
        level: 'warning',
        tags: {
          email_event: event.type.replace('email.', ''),
          email_id: event.data.email_id,
        },
        extra: {
          from: event.data.from,
          to: event.data.to,
          subject: event.data.subject,
          created_at: event.created_at,
        },
      }
    )
    await Sentry.flush(2000)
  }

  return NextResponse.json({ received: true })
}
