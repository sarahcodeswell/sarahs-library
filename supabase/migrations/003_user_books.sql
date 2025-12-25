-- User Books Table
-- Stores each user's personal book collection (books they own)
-- This is separate from the master catalog (books.json) and reading_queue

CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  isbn TEXT,
  cover_image_url TEXT,
  added_via TEXT CHECK (added_via IN ('photo', 'manual', 'import')),
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_book UNIQUE(user_id, book_title, book_author)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_title ON user_books(book_title);
CREATE INDEX IF NOT EXISTS idx_user_books_author ON user_books(book_author);

-- Enable RLS
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own books" ON user_books
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON user_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON user_books
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON user_books
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_books_updated_at
  BEFORE UPDATE ON user_books
  FOR EACH ROW
  EXECUTE FUNCTION update_user_books_updated_at();
