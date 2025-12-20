-- Documentation of existing tables (for reference)
-- These tables should already exist in your Supabase database

-- Taste Profiles Table
-- Stores user preferences and liked books
CREATE TABLE IF NOT EXISTS taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  liked_books JSONB DEFAULT '[]'::jsonb,
  liked_themes TEXT[] DEFAULT ARRAY[]::TEXT[],
  liked_authors TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taste_profiles_user_id ON taste_profiles(user_id);

-- Reading Queue Table
-- Stores user's saved books and reading list
CREATE TABLE IF NOT EXISTS reading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  status TEXT DEFAULT 'want_to_read', -- 'want_to_read', 'reading', 'finished'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_queue_user_id ON reading_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_queue_status ON reading_queue(status);

-- Enable RLS
ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for taste_profiles
CREATE POLICY IF NOT EXISTS "Users can view own taste profile" ON taste_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own taste profile" ON taste_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own taste profile" ON taste_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for reading_queue
CREATE POLICY IF NOT EXISTS "Users can view own reading queue" ON reading_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert to own reading queue" ON reading_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own reading queue" ON reading_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete from own reading queue" ON reading_queue
  FOR DELETE USING (auth.uid() = user_id);
