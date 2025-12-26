-- Chat History Table
-- Stores user chat conversations for persistence across sessions

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  is_user_message BOOLEAN NOT NULL DEFAULT false,
  chat_mode TEXT CHECK (chat_mode IN ('library', 'world')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON chat_history(user_id, session_id);

-- Row Level Security
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
CREATE POLICY "Users can view own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat history" ON chat_history;
CREATE POLICY "Users can insert own chat history"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat history" ON chat_history;
CREATE POLICY "Users can delete own chat history"
  ON chat_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up old chat history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_history()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_history
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_chat_history() TO authenticated;
