-- Reading Moments: Voice notes for books
-- This is the foundation for the Reading Moments feature

-- Main moments table
CREATE TABLE IF NOT EXISTS reading_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  book_id UUID REFERENCES books,
  -- For taste capture (no book associated)
  capture_type TEXT CHECK (capture_type IN ('book_moment', 'taste_capture')) DEFAULT 'book_moment',
  capture_category TEXT, -- e.g., 'why_i_read', 'quality_lens', 'voice', 'emotional_palette'
  capture_prompt TEXT, -- The question being answered
  
  -- Audio data
  audio_path TEXT NOT NULL,
  audio_duration_seconds INTEGER,
  
  -- Transcription
  transcript TEXT,
  transcribed_at TIMESTAMPTZ,
  
  -- Position in book (for book moments)
  position_reported TEXT CHECK (position_reported IN ('early', 'middle', 'late', 'custom')),
  position_custom TEXT,
  
  -- AI Processing (Opt-In)
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_processed_at TIMESTAMPTZ,
  ai_consent_given BOOLEAN DEFAULT FALSE,
  extraction_json JSONB,
  
  -- Denormalized AI fields for queries
  primary_emotion TEXT,
  emotion_intensity TEXT CHECK (emotion_intensity IN ('low', 'medium', 'high')),
  emotion_valence TEXT CHECK (emotion_valence IN ('positive', 'negative', 'mixed')),
  has_personal_connection BOOLEAN,
  position_inferred TEXT,
  
  -- AI Glimpse data
  glimpse_feeling TEXT,
  glimpse_observation TEXT,
  glimpse_generated_at TIMESTAMPTZ,
  glimpse_saved BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  audio_deleted BOOLEAN DEFAULT FALSE
);

-- User preferences for AI insights
CREATE TABLE IF NOT EXISTS user_moment_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  show_ai_glimpses BOOLEAN, -- null = hasn't chosen yet
  pattern_tracking_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moments_user_book ON reading_moments(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_moments_user_created ON reading_moments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_capture_type ON reading_moments(user_id, capture_type);
CREATE INDEX IF NOT EXISTS idx_moments_emotion ON reading_moments(primary_emotion, emotion_valence);

-- RLS Policies
ALTER TABLE reading_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_moment_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own moments
CREATE POLICY "Users own their moments"
  ON reading_moments FOR ALL
  USING (auth.uid() = user_id);

-- Users can only see their own preferences
CREATE POLICY "Users own their preferences"
  ON user_moment_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_reading_moments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_moments_updated_at
  BEFORE UPDATE ON reading_moments
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_moments_updated_at();

CREATE TRIGGER user_moment_preferences_updated_at
  BEFORE UPDATE ON user_moment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_moments_updated_at();
