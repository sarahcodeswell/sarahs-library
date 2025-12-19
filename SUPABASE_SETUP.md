# Supabase Setup Instructions

## 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## 2. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Copy your project URL and anon key

## 3. Add Environment Variables

Create `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Create Database Tables

Run these SQL commands in your Supabase SQL editor:

### Taste Profiles Table

```sql
CREATE TABLE taste_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_books JSONB DEFAULT '[]'::jsonb,
  liked_themes TEXT[] DEFAULT ARRAY[]::TEXT[],
  liked_authors TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own taste profile
CREATE POLICY "Users can manage their own taste profile"
  ON taste_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Reading Queue Table

```sql
CREATE TABLE reading_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  status TEXT DEFAULT 'want_to_read' CHECK (status IN ('want_to_read', 'reading', 'finished')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reading_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own reading queue
CREATE POLICY "Users can manage their own reading queue"
  ON reading_queue
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX reading_queue_user_id_idx ON reading_queue(user_id);
CREATE INDEX reading_queue_added_at_idx ON reading_queue(added_at DESC);
```

## 5. Configure Authentication

In Supabase Dashboard:
1. Go to Authentication > Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Set site URL to your deployment URL

## 6. Test Connection

The app will automatically connect once environment variables are set.
