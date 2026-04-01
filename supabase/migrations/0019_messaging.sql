-- Migration: messaging
-- One-thread-per-relationship teacher-parent messaging.
-- conversations: one per teacher+parent pair.
-- messages: text messages within a conversation.
-- Realtime publication on messages for live delivery.

-- ===== conversations =====
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_teacher_parent_unique UNIQUE (teacher_id, parent_id)
);

CREATE INDEX idx_conversations_teacher_id ON conversations (teacher_id);
CREATE INDEX idx_conversations_parent_id  ON conversations (parent_id);
CREATE INDEX idx_conversations_last_message_at ON conversations (last_message_at DESC);

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messages_body_not_empty CHECK (char_length(trim(body)) > 0),
  CONSTRAINT messages_body_max_length CHECK (char_length(body) <= 2000)
);

CREATE INDEX idx_messages_conversation_id ON messages (conversation_id, created_at);
CREATE INDEX idx_messages_sender_id       ON messages (sender_id);

-- ===== RLS =====
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: participants can read their own conversations.
-- A user is a participant if they are the parent_id OR own the teacher row.
CREATE POLICY "participant_select" ON conversations
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Conversations: only the system (service role) inserts conversations.
-- No INSERT policy for authenticated users — upserts go through supabaseAdmin.

-- Messages: participants can read messages in their conversations.
CREATE POLICY "participant_select" ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.parent_id = auth.uid()
         OR c.teacher_id IN (SELECT t.id FROM teachers t WHERE t.user_id = auth.uid())
    )
  );

-- Messages: participants can insert messages into their conversations.
CREATE POLICY "participant_insert" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.parent_id = auth.uid()
         OR c.teacher_id IN (SELECT t.id FROM teachers t WHERE t.user_id = auth.uid())
    )
  );

-- ===== Realtime =====
-- Publish messages table to Supabase Realtime so clients can subscribe.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
