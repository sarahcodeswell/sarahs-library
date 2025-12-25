-- User Recommendations Feature
-- Allows users to recommend books to friends with personal notes

-- User Recommendations Table
CREATE TABLE IF NOT EXISTS user_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_isbn TEXT,
  recommendation_note TEXT, -- User's personal note: "Why I recommend this"
  is_from_collection BOOLEAN DEFAULT false, -- Is this from their finished books?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Recommendations (shareable links)
CREATE TABLE IF NOT EXISTS shared_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_id UUID REFERENCES user_recommendations(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL, -- Unique token for shareable URL
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_created_at ON user_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_recommendations_token ON shared_recommendations(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_recommendations_recommendation_id ON shared_recommendations(recommendation_id);

-- Enable Row Level Security
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_recommendations
CREATE POLICY "Users can view own recommendations"
  ON user_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendations"
  ON user_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON user_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON user_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for shared_recommendations
-- Anyone can view shared recommendations (public links)
CREATE POLICY "Anyone can view shared recommendations"
  ON shared_recommendations FOR SELECT
  USING (true);

-- Only owner can create shares for their own recommendations
CREATE POLICY "Users can create shares for own recommendations"
  ON shared_recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_recommendations
      WHERE id = recommendation_id AND user_id = auth.uid()
    )
  );

-- Only owner can update shares
CREATE POLICY "Users can update own shares"
  ON shared_recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_recommendations
      WHERE id = recommendation_id AND user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_recommendations_updated_at
  BEFORE UPDATE ON user_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
