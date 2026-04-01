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

  // For each conversation, fetch the last message and the other participant's name
  const enriched = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      // Fetch last message
      const { data: lastMsg } = await supabaseAdmin
        .from('messages')
        .select('body, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Resolve the other participant's display name
      let otherParticipantName = 'Unknown'
      if (isTeacher) {
        // Other participant is the parent — get email or name from auth
        const {
          data: { user: parentUser },
        } = await supabaseAdmin.auth.admin.getUserById(conv.parent_id)
        otherParticipantName =
          parentUser?.user_metadata?.full_name ??
          parentUser?.email ??
          'Parent'
      } else {
        // Other participant is the teacher
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
  )

  return NextResponse.json(enriched)
}
