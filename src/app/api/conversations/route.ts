import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'

/**
 * GET /api/conversations
 * Returns conversations for the authenticated user (teacher or parent).
 * Includes the other participant's name and the last message preview.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine role: if the user has a teacher row, they're a teacher.
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const isTeacher = !!teacher

  // Fetch conversations where user is a participant
  let query = supabaseAdmin
    .from('conversations')
    .select(
      'id, teacher_id, parent_id, last_message_at, created_at, teachers(id, full_name, photo_url)'
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (isTeacher) {
    query = query.eq('teacher_id', teacher.id)
  } else {
    query = query.eq('parent_id', user.id)
  }

  const { data: conversations, error } = await query

  if (error) {
    console.error('[GET /api/conversations] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }

  const convList = conversations ?? []
  if (convList.length === 0) return NextResponse.json([])

  // --- Batch-fetch last messages (1 query instead of N) ---
  // Use each conversation's last_message_at to pinpoint the exact message row
  const convsWithMessages = convList.filter((c) => c.last_message_at)
  const lastMessageMap = new Map<
    string,
    { body: string; sender_id: string; created_at: string }
  >()

  if (convsWithMessages.length > 0) {
    const orFilter = convsWithMessages
      .map(
        (c) =>
          `and(conversation_id.eq.${c.id},created_at.eq.${c.last_message_at})`
      )
      .join(',')

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('conversation_id, body, sender_id, created_at')
      .or(orFilter)

    for (const msg of messages ?? []) {
      lastMessageMap.set(msg.conversation_id, msg)
    }
  }

  // --- Batch-fetch parent names (1 call per unique parent instead of per conversation) ---
  const parentNameMap = new Map<string, string>()
  if (isTeacher) {
    const uniqueParentIds = [...new Set(convList.map((c) => c.parent_id))]
    const parentResults = await Promise.all(
      uniqueParentIds.map((pid) =>
        supabaseAdmin.auth.admin.getUserById(pid)
      )
    )
    for (let i = 0; i < uniqueParentIds.length; i++) {
      const parentUser = parentResults[i].data?.user
      parentNameMap.set(
        uniqueParentIds[i],
        parentUser?.user_metadata?.full_name ??
          parentUser?.email ??
          'Parent'
      )
    }
  }

  // --- Assemble response (no additional queries) ---
  const enriched = convList.map((conv) => {
    const lastMsg = lastMessageMap.get(conv.id) ?? null

    let otherParticipantName: string
    if (isTeacher) {
      otherParticipantName = parentNameMap.get(conv.parent_id) ?? 'Parent'
    } else {
      const teacherData = conv.teachers as unknown as {
        id: string
        full_name: string
        photo_url: string | null
      }
      otherParticipantName = teacherData?.full_name ?? 'Teacher'
    }

    return {
      id: conv.id,
      teacherId: conv.teacher_id,
      parentId: conv.parent_id,
      otherParticipantName,
      lastMessage: lastMsg
        ? {
            body:
              lastMsg.body.length > 100
                ? lastMsg.body.slice(0, 97) + '...'
                : lastMsg.body,
            senderId: lastMsg.sender_id,
            createdAt: lastMsg.created_at,
          }
        : null,
      lastMessageAt: conv.last_message_at,
      createdAt: conv.created_at,
    }
  })

  return NextResponse.json(enriched)
}
