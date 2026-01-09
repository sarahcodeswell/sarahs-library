-- Fix pgvector schema issue
-- Error: "operator does not exist: extensions.vector <=> extensions.vector"
-- This happens when pgvector is in the 'extensions' schema but the function uses 'public' schema
-- Also fixed: return type REAL -> DOUBLE PRECISION (the <=> operator returns double precision)

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS find_similar_books(vector(1536), INT, REAL);

-- Recreate with correct schema and return type
CREATE OR REPLACE FUNCTION find_similar_books(
  query_embedding vector(1536),
  limit_count INT DEFAULT 10,
  similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  description TEXT,
  themes TEXT[],
  genre TEXT,
  sarah_assessment TEXT,
  similarity DOUBLE PRECISION
) 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.description,
    b.themes,
    b.genre,
    b.sarah_assessment,
    1 - (b.embedding <=> query_embedding) as similarity
  FROM books b
  WHERE b.embedding IS NOT NULL
    AND 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_similar_books(vector(1536), INT, REAL) TO anon;
GRANT EXECUTE ON FUNCTION find_similar_books(vector(1536), INT, REAL) TO authenticated;
