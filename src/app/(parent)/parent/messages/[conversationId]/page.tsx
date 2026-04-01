import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { ChatWindow, type Message } from '@/components/messaging/ChatWindow'

interface Props {
  params: Promise<{ conversationId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { conversationId } = await params

  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('teachers(full_name)')
    .eq('id', conversationId)
    .maybeSingle()

  const teacherData = conv?.teachers as unknown as { full_name: string } | null
  const name = teacherData?.full_name ?? 'Chat'

  return { title: `${name} — Messages — Tutelo` }
}

export default async function ParentChatPage({ params }: Props) {
  const { conversationId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/parent/messages')

  // Fetch conversation and verify the parent is a participant
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id, teacher_id, parent_id, teachers(id, full_name)')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv || conv.parent_id !== user.id) {
    notFound()
  }

  const teacherData = conv.teachers as unknown as {
    id: string
    full_name: string
  } | null

  // Fetch initial messages
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={(messages as Message[]) ?? []}
      currentUserId={user.id}
      otherParticipantName={teacherData?.full_name ?? 'Teacher'}
      backHref="/parent/messages"
    />
  )
}
