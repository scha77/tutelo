import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { NewMessageEmail } from '@/emails/NewMessageEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

const SendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  teacherId: z.string().uuid('Invalid teacher ID').optional(),
  body: z
    .string()
    .min(1, 'Message body is required')
    .max(2000, 'Message must be 2000 characters or less')
    .refine((val) => val.trim().length > 0, 'Message body cannot be blank'),
})

// Rate-limit: skip email if last notification was less than 5 minutes ago
const EMAIL_COOLDOWN_MS = 5 * 60 * 1000

/**
 * GET /api/messages?conversationId=<uuid>
 * Returns messages for a conversation, ordered by created_at ascending.
 * Validates the caller is a participant.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId query parameter is required' },
      { status: 400 }
    )
  }

  // Validate UUID format
  const uuidSchema = z.string().uuid()
  if (!uuidSchema.safeParse(conversationId).success) {
    return NextResponse.json(
      { error: 'Invalid conversationId format' },
      { status: 400 }
    )
  }

  // Verify participant
  const isParticipant = await checkParticipant(conversationId, user.id)
  if (!isParticipant) {
    return NextResponse.json(
      { error: 'Not a participant in this conversation' },
      { status: 403 }
    )
  }

  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/messages] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }

  return NextResponse.json(messages)
}

/**
 * POST /api/messages
 * Send a message. Either conversationId (existing thread) or teacherId (new thread) required.
 * Creates conversation on first message to a teacher.
 * Sends rate-limited email notification to the other participant.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SendMessageSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { conversationId, teacherId, body } = parsed.data

  if (!conversationId && !teacherId) {
    return NextResponse.json(
      { error: 'Either conversationId or teacherId is required' },
      { status: 400 }
    )
  }

  let resolvedConversationId = conversationId

  // Determine the sender's teacher record (if any) for role resolution
  const { data: senderTeacher } = await supabaseAdmin
    .from('teachers')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  // If teacherId provided, upsert a conversation (first message to a teacher)
  if (!resolvedConversationId && teacherId) {
    // Verify teacher exists
    const { data: targetTeacher } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('id', teacherId)
      .maybeSingle()

    if (!targetTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 400 }
      )
    }

    // Determine the parent_id: if sender is a teacher, they can't create conversations this way
    // For now, only parents initiate conversations via teacherId
    // Teachers reply to existing conversations via conversationId
    const parentId = senderTeacher ? null : user.id

    if (!parentId) {
      // Teacher trying to start conversation — they should use conversationId
      return NextResponse.json(
        {
          error:
            'Teachers must use conversationId to reply. Only parents can start new conversations.',
        },
        { status: 400 }
      )
    }

    // Upsert conversation: find existing or create
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('parent_id', parentId)
      .maybeSingle()

    if (existingConv) {
      resolvedConversationId = existingConv.id
    } else {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ teacher_id: teacherId, parent_id: parentId })
        .select('id')
        .single()

      if (convError) {
        // Handle race condition: unique constraint violation means it was just created
        if (
          convError.code === '23505' ||
          convError.message?.includes('unique')
        ) {
          const { data: raceConv } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('teacher_id', teacherId)
            .eq('parent_id', parentId)
            .single()
          resolvedConversationId = raceConv?.id
        } else {
          console.error(
            '[POST /api/messages] Conversation insert failed:',
            convError
          )
          return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
          )
        }
      } else {
        resolvedConversationId = newConv.id
      }
    }
  }

  if (!resolvedConversationId) {
    return NextResponse.json(
      { error: 'Could not resolve conversation' },
      { status: 500 }
    )
  }

  // Verify sender is a participant
  const isParticipant = await checkParticipant(resolvedConversationId, user.id)
  if (!isParticipant) {
    return NextResponse.json(
      { error: 'Not a participant in this conversation' },
      { status: 403 }
    )
  }

  // Insert message
  const { data: message, error: msgError } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: resolvedConversationId,
      sender_id: user.id,
      body: body.trim(),
    })
    .select('id, conversation_id, sender_id, body, created_at')
    .single()

  if (msgError) {
    console.error('[POST /api/messages] Message insert failed:', msgError)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }

  // Update conversation last_message_at
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: message.created_at })
    .eq('id', resolvedConversationId)

  // Send email notification (non-blocking — never fail the message insert)
  try {
    await sendNotificationEmail(resolvedConversationId, user.id, body.trim(), senderTeacher)
  } catch (err) {
    Sentry.captureException(err)
    console.error('[POST /api/messages] Email notification failed:', err)
  }

  return NextResponse.json(message, { status: 201 })
}

// ==================== Helpers ====================

/**
 * Check if userId is a participant in the given conversation.
 * A user is a participant if they are the parent_id or own the teacher row.
 */
async function checkParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('teacher_id, parent_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv) return false

  // Direct parent match
  if (conv.parent_id === userId) return true

  // Check if userId owns the teacher
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('id', conv.teacher_id)
    .eq('user_id', userId)
    .maybeSingle()

  return !!teacher
}

/**
 * Send a rate-limited email notification to the other participant.
 * Skips email if last notification was < 5 minutes ago.
 * Email failures are caught and logged — never fail the message.
 */
async function sendNotificationEmail(
  conversationId: string,
  senderId: string,
  messageBody: string,
  senderTeacher: { id: string; full_name: string } | null
) {
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select(
      'id, teacher_id, parent_id, last_notified_at, teachers(id, full_name, user_id, social_email)'
    )
    .eq('id', conversationId)
    .single()

  if (!conv) return

  const teacherData = conv.teachers as unknown as {
    id: string
    full_name: string
    user_id: string
    social_email: string | null
  }

  // Rate-limit check
  if (conv.last_notified_at) {
    const elapsed =
      Date.now() - new Date(conv.last_notified_at).getTime()
    if (elapsed < EMAIL_COOLDOWN_MS) {
      return // Skip — too soon
    }
  }

  // Determine recipient and sender name
  const senderIsTeacher = senderTeacher && teacherData.user_id !== senderId
    ? false // sender is parent, because senderTeacher is a different teacher
    : senderTeacher
      ? teacherData.user_id === senderId // sender IS this conversation's teacher
      : false

  let recipientEmail: string | null = null
  let recipientFirstName = 'there'
  let senderName: string

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'

  if (teacherData.user_id === senderId) {
    // Sender is teacher → notify parent
    senderName = teacherData.full_name
    // Get parent email from auth
    const {
      data: { user: parentUser },
    } = await supabaseAdmin.auth.admin.getUserById(conv.parent_id)
    recipientEmail = parentUser?.email ?? null
    recipientFirstName =
      parentUser?.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  } else {
    // Sender is parent → notify teacher
    const {
      data: { user: senderUser },
    } = await supabaseAdmin.auth.admin.getUserById(senderId)
    senderName =
      senderUser?.user_metadata?.full_name ?? senderUser?.email ?? 'A parent'
    recipientEmail = teacherData.social_email
    recipientFirstName = teacherData.full_name.split(' ')[0]
  }

  if (!recipientEmail) {
    console.warn(
      `[messaging-email] No email for recipient in conversation ${conversationId} — skipping`
    )
    return
  }

  // Determine conversation URL based on recipient role
  let conversationUrl: string
  if (teacherData.user_id === senderId) {
    // Recipient is parent
    conversationUrl = `${appUrl}/parent/messages/${conversationId}`
  } else {
    // Recipient is teacher
    conversationUrl = `${appUrl}/dashboard/messages/${conversationId}`
  }

  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    react: NewMessageEmail({
      recipientFirstName,
      senderName,
      messagePreview: messageBody,
      conversationUrl,
      appUrl,
    }),
  })

  // Update last_notified_at
  await supabaseAdmin
    .from('conversations')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('id', conversationId)
}
