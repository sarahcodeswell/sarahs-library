-- Add embedding and metadata columns to reading_queue for vector search
-- This enables semantic search across user's personal collection

-- Add embedding column (same dimension as books table for consistency)
ALTER TABLE reading_queue ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add genre/theme metadata columns
ALTER TABLE reading_queue ADD COLUMN IF NOT EXISTS genres TEXT[];
ALTER TABLE reading_queue ADD COLUMN IF NOT EXISTS themes TEXT[];
ALTER TABLE reading_queue ADD COLUMN IF NOT EXISTS subjects TEXT[];

-- Create index for vector search
CREATE INDEX IF NOT EXISTS reading_queue_embedding_idx 
  ON reading_queue USING hnsw (embedding vector_cosine_ops);

-- Function to find similar books in user's reading queue
CREATE OR REPLACE FUNCTION find_similar_user_books(
  query_embedding vector(1536),
  target_user_id UUID,
  limit_count INT DEFAULT 10,
  similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  book_title TEXT,
  book_author TEXT,
  description TEXT,
  genres TEXT[],
  themes TEXT[],
  rating INT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rq.id,
    rq.book_title,
    rq.book_author,
    rq.description,
    rq.genres,
    rq.themes,
    rq.rating,
    1 - (rq.embedding <=> query_embedding) as similarity
  FROM reading_queue rq
  WHERE rq.user_id = target_user_id
    AND rq.embedding IS NOT NULL
    AND 1 - (rq.embedding <=> query_embedding) > similarity_threshold
  ORDER BY rq.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
