-- Create received_recommendations table for tracking books shared with users
CREATE TABLE IF NOT EXISTS received_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_recommendation_id UUID REFERENCES shared_recommendations(id) ON DELETE CASCADE NOT NULL,
  recommender_name TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_isbn TEXT,
  book_description TEXT,
  recommendation_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'archived'
  added_to_queue_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_received_recommendations_recipient ON received_recommendations(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_status ON received_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_received_at ON received_recommendations(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_shared_rec ON received_recommendations(shared_recommendation_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_received_recommendations_recipient_status ON received_recommendations(recipient_user_id, status);

-- Enable Row Level Security
ALTER TABLE received_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own received recommendations
CREATE POLICY "Users can view own received recommendations"
  ON received_recommendations FOR SELECT
  USING (auth.uid() = recipient_user_id);

-- Users can insert received recommendations for themselves
CREATE POLICY "Users can create own received recommendations"
  ON received_recommendations FOR INSERT
  WITH CHECK (auth.uid() = recipient_user_id);

-- Users can update their own received recommendations (status changes)
CREATE POLICY "Users can update own received recommendations"
  ON received_recommendations FOR UPDATE
  USING (auth.uid() = recipient_user_id);

-- Users can delete their own received recommendations
CREATE POLICY "Users can delete own received recommendations"
  ON received_recommendations FOR DELETE
  USING (auth.uid() = recipient_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_received_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_received_recommendations_updated_at
  BEFORE UPDATE ON received_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_received_recommendations_updated_at();

-- Add columns to reading_queue to preserve recommendation context
ALTER TABLE reading_queue 
  ADD COLUMN IF NOT EXISTS recommended_by TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_note TEXT,
  ADD COLUMN IF NOT EXISTS received_recommendation_id UUID REFERENCES received_recommendations(id) ON DELETE SET NULL;

-- Index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_reading_queue_received_rec ON reading_queue(received_recommendation_id);
