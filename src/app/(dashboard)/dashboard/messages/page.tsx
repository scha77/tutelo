import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { supabaseAdmin } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const metadata = { title: 'Messages — Tutelo' }

export default async function TeacherMessagesPage() {
  const { teacher, userId } = await getTeacher()
  if (!teacher || !userId) redirect('/login')

  // Fetch conversations where user is the teacher
  const { data: conversations, error } = await supabaseAdmin
    .from('conversations')
    .select('id, teacher_id, parent_id, last_message_at, created_at')
    .eq('teacher_id', teacher.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Conversations with parents about sessions and scheduling.</p>
        </div>
        <p className="text-muted-foreground">
          Unable to load your messages. Please try again later.
        </p>
      </div>
    )
  }

  // Enrich with last message + parent name for each conversation
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

      // Resolve parent display name from auth
      let parentName = 'Parent'
      const {
        data: { user: parentUser },
      } = await supabaseAdmin.auth.admin.getUserById(conv.parent_id)
      if (parentUser) {
        parentName =
          parentUser.user_metadata?.full_name ??
          parentUser.email ??
          'Parent'
      }

      return {
        id: conv.id,
        otherParticipantName: parentName,
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
      }
    })
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conversations with parents about sessions and scheduling.</p>
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold">No messages yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Messages from parents will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/messages/${conv.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0 mt-0.5">
                      {conv.otherParticipantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-semibold truncate">
                        {conv.otherParticipantName}
                      </h3>
                      {conv.lastMessage ? (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.senderId === userId
                            ? 'You: '
                            : ''}
                          {conv.lastMessage.body}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {conv.lastMessage?.createdAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(
                          new Date(conv.lastMessage.createdAt),
                          { addSuffix: true }
                        )}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
