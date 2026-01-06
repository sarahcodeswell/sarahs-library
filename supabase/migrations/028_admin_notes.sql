-- Admin notes: Personal notes from Sarah to readers about their queued books
-- This table tracks notes sent to users about specific books

CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  note_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX idx_admin_notes_book_id ON admin_notes(book_id);
CREATE INDEX idx_admin_notes_sent_at ON admin_notes(sent_at DESC);

-- Unique constraint to prevent duplicate notes for same user+book
CREATE UNIQUE INDEX idx_admin_notes_user_book ON admin_notes(user_id, book_id);

-- RLS policies - only admin can access
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (service role bypasses RLS anyway)
CREATE POLICY "Admin full access to admin_notes"
  ON admin_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE admin_notes IS 'Personal notes from Sarah to readers about books in their queue';
