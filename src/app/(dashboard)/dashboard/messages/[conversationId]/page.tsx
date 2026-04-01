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
    .select('parent_id')
    .eq('id', conversationId)
    .maybeSingle()

  let name = 'Chat'
  if (conv?.parent_id) {
    const {
      data: { user: parentUser },
    } = await supabaseAdmin.auth.admin.getUserById(conv.parent_id)
    name = parentUser?.user_metadata?.full_name ?? parentUser?.email ?? 'Chat'
  }

  return { title: `${name} — Messages — Tutelo` }
}

export default async function TeacherChatPage({ params }: Props) {
  const { conversationId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolve teacher row for the current user
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  // Fetch conversation and verify the teacher is a participant
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id, teacher_id, parent_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv || conv.teacher_id !== teacher.id) {
    notFound()
  }

  // Resolve parent name
  let parentName = 'Parent'
  const {
    data: { user: parentUser },
  } = await supabaseAdmin.auth.admin.getUserById(conv.parent_id)
  if (parentUser) {
    parentName =
      parentUser.user_metadata?.full_name ?? parentUser.email ?? 'Parent'
  }

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
      otherParticipantName={parentName}
      backHref="/dashboard/messages"
    />
  )
}
