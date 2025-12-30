-- Dismissed Recommendations Table
-- Tracks books that users have explicitly dismissed with "Not For Me"
-- This feeds into the user_exclusion_list materialized view

CREATE TABLE IF NOT EXISTS dismissed_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_dismissed_book UNIQUE(user_id, book_title)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dismissed_recommendations_user_id ON dismissed_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_recommendations_title ON dismissed_recommendations(book_title);

-- Enable Row Level Security
ALTER TABLE dismissed_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dismissed recommendations"
  ON dismissed_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissed recommendations"
  ON dismissed_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dismissed recommendations"
  ON dismissed_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Refresh the materialized view to include dismissed recommendations
-- The trigger already exists in 010_user_exclusion_view.sql
REFRESH MATERIALIZED VIEW CONCURRENTLY user_exclusion_list;
