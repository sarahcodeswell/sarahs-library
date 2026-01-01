-- Cross-user learning functions for smarter recommendations
-- These aggregate insights from all users' collections and ratings

-- Find similar books across ALL users' reading queues with popularity weighting
CREATE OR REPLACE FUNCTION find_popular_similar_books(
  query_embedding vector(1536),
  limit_count INT DEFAULT 10,
  similarity_threshold REAL DEFAULT 0.6
)
RETURNS TABLE (
  isbn TEXT,
  book_title TEXT,
  book_author TEXT,
  description TEXT,
  genres TEXT[],
  avg_rating NUMERIC,
  user_count BIGINT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rq.isbn,
    rq.book_title,
    rq.book_author,
    MAX(rq.description) as description,
    MAX(rq.genres) as genres,
    ROUND(AVG(rq.rating)::numeric, 1) as avg_rating,
    COUNT(DISTINCT rq.user_id) as user_count,
    MAX(1 - (rq.embedding <=> query_embedding))::REAL as similarity
  FROM reading_queue rq
  WHERE rq.embedding IS NOT NULL
    AND 1 - (rq.embedding <=> query_embedding) > similarity_threshold
  GROUP BY rq.isbn, rq.book_title, rq.book_author
  ORDER BY 
    -- Rank by combination of similarity and popularity
    (MAX(1 - (rq.embedding <=> query_embedding)) * 0.6 + 
     COALESCE(AVG(rq.rating), 3) / 5.0 * 0.3 +
     LEAST(COUNT(DISTINCT rq.user_id)::numeric / 10.0, 0.1)) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get popular books across all users (crowd wisdom)
CREATE OR REPLACE FUNCTION get_popular_books(
  min_rating NUMERIC DEFAULT 4,
  min_users INT DEFAULT 2,
  genre_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  isbn TEXT,
  book_title TEXT,
  book_author TEXT,
  description TEXT,
  genres TEXT[],
  avg_rating NUMERIC,
  user_count BIGINT,
  total_rating_weight NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rq.isbn,
    rq.book_title,
    rq.book_author,
    MAX(rq.description) as description,
    MAX(rq.genres) as genres,
    ROUND(AVG(rq.rating)::numeric, 1) as avg_rating,
    COUNT(DISTINCT rq.user_id) as user_count,
    SUM(COALESCE(rq.rating, 3))::numeric as total_rating_weight
  FROM reading_queue rq
  WHERE rq.rating IS NOT NULL
    AND (genre_filter IS NULL OR rq.genres && genre_filter)
  GROUP BY rq.isbn, rq.book_title, rq.book_author
  HAVING AVG(rq.rating) >= min_rating
    AND COUNT(DISTINCT rq.user_id) >= min_users
  ORDER BY 
    -- Rank by weighted combination of rating and popularity
    (AVG(rq.rating) * COUNT(DISTINCT rq.user_id)) DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track recommendation outcomes for learning
CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_isbn TEXT,
  recommended_title TEXT,
  recommended_author TEXT,
  source TEXT, -- 'ai', 'vector', 'popular'
  action TEXT, -- 'saved', 'dismissed', 'clicked'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS recommendation_outcomes_isbn_idx 
  ON recommendation_outcomes(recommended_isbn);
CREATE INDEX IF NOT EXISTS recommendation_outcomes_action_idx 
  ON recommendation_outcomes(action, created_at);

-- RLS for recommendation_outcomes
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendation outcomes" ON recommendation_outcomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendation outcomes" ON recommendation_outcomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get recommendation success rate by book
CREATE OR REPLACE FUNCTION get_recommendation_success_rates()
RETURNS TABLE (
  isbn TEXT,
  book_title TEXT,
  times_recommended BIGINT,
  times_saved BIGINT,
  times_dismissed BIGINT,
  save_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.recommended_isbn as isbn,
    MAX(ro.recommended_title) as book_title,
    COUNT(*) as times_recommended,
    COUNT(*) FILTER (WHERE ro.action = 'saved') as times_saved,
    COUNT(*) FILTER (WHERE ro.action = 'dismissed') as times_dismissed,
    ROUND(
      COUNT(*) FILTER (WHERE ro.action = 'saved')::numeric / 
      NULLIF(COUNT(*), 0) * 100, 1
    ) as save_rate
  FROM recommendation_outcomes ro
  WHERE ro.recommended_isbn IS NOT NULL
  GROUP BY ro.recommended_isbn
  HAVING COUNT(*) >= 3  -- Only show books recommended at least 3 times
  ORDER BY save_rate DESC, times_recommended DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
