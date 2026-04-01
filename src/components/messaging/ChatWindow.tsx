'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  /** Marks optimistically-sent messages that haven't been confirmed yet */
  _optimistic?: boolean
}

interface ChatWindowProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  otherParticipantName: string
  /** URL to go back to conversation list */
  backHref: string
}

export function ChatWindow({
  conversationId,
  initialMessages,
  currentUserId,
  otherParticipantName,
  backHref,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe to Realtime postgres_changes on the messages table
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          // Deduplicate: skip if we already have this message (from optimistic append)
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) {
              // Replace the optimistic version with the confirmed one
              return prev.map((m) => (m.id === incoming.id ? incoming : m))
            }
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const handleSend = useCallback(async () => {
    const body = newMessage.trim()
    if (!body || sending) return

    setSending(true)
    setNewMessage('')

    // Optimistic append
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body }),
      })

      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        const err = await res.json().catch(() => ({}))
        console.error('[ChatWindow] Send failed:', err)
        return
      }

      const confirmed: Message = await res.json()
      // Replace optimistic message with confirmed one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? confirmed : m))
      )
    } catch (err) {
      // Remove optimistic message on network failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      console.error('[ChatWindow] Network error:', err)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [newMessage, sending, conversationId, currentUserId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <Link href={backHref}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="font-semibold truncate">{otherParticipantName}</h2>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            No messages yet. Send one to start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                } ${msg._optimistic ? 'opacity-70' : ''}`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.body}
                </p>
                <p
                  className={`text-[10px] mt-1 ${
                    isOwn
                      ? 'text-primary-foreground/60'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32"
            rows={1}
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
