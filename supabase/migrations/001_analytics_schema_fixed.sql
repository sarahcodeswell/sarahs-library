-- Analytics Schema for Sarah's Books (Fixed - handles existing objects)
-- Tracks user interactions to improve recommendations

-- Drop existing objects if they exist (clean slate)
DROP TABLE IF EXISTS user_events CASCADE;
DROP TABLE IF EXISTS book_interactions CASCADE;
DROP TABLE IF EXISTS search_queries CASCADE;
DROP TABLE IF EXISTS theme_interactions CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP VIEW IF EXISTS admin_analytics CASCADE;

-- User interaction events table
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_session_id ON user_events(session_id);
CREATE INDEX idx_user_events_event_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);

-- Book interaction tracking (saves, clicks, expansions)
CREATE TABLE book_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  interaction_type TEXT NOT NULL, -- 'save', 'expand', 'buy_click', 'review_click', 'share'
  chat_mode TEXT, -- 'library' or 'discover'
  source TEXT, -- 'recommendation_card', 'collection_page', etc.
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for book interactions
CREATE INDEX idx_book_interactions_user_id ON book_interactions(user_id);
CREATE INDEX idx_book_interactions_book_title ON book_interactions(book_title);
CREATE INDEX idx_book_interactions_type ON book_interactions(interaction_type);
CREATE INDEX idx_book_interactions_created_at ON book_interactions(created_at DESC);

-- Search and filter tracking
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  chat_mode TEXT,
  selected_themes TEXT[],
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search queries
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at DESC);

-- Theme filter usage tracking
CREATE TABLE theme_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_key TEXT NOT NULL,
  action TEXT NOT NULL, -- 'selected' or 'removed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for theme interactions
CREATE INDEX idx_theme_interactions_user_id ON theme_interactions(user_id);
CREATE INDEX idx_theme_interactions_theme ON theme_interactions(theme_key);

-- Session tracking
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER
);

-- Indexes for sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own events" ON user_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own book interactions" ON book_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own searches" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own theme interactions" ON theme_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert analytics data (via API)
CREATE POLICY "Service role can insert events" ON user_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert book interactions" ON book_interactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert searches" ON search_queries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert theme interactions" ON theme_interactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert sessions" ON user_sessions
  FOR INSERT WITH CHECK (true);

-- Admin view for sarah@darkridge.com
CREATE VIEW admin_analytics AS
SELECT 
  'book_interactions' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as date
FROM book_interactions
GROUP BY DATE_TRUNC('day', created_at)
UNION ALL
SELECT 
  'search_queries' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as date
FROM search_queries
GROUP BY DATE_TRUNC('day', created_at)
UNION ALL
SELECT 
  'user_sessions' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', started_at) as date
FROM user_sessions
GROUP BY DATE_TRUNC('day', started_at);

-- Grant access to admin view
GRANT SELECT ON admin_analytics TO authenticated;
