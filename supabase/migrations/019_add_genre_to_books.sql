-- Add genre column to books table
-- Genre is distinct from curator themes (Sarah's thematic tags like women, emotional, identity, justice, spiritual)
-- Genre represents the book's category (Literary Fiction, Memoir, Thriller, etc.)

ALTER TABLE books ADD COLUMN IF NOT EXISTS genre TEXT;

-- Create index for genre searches
CREATE INDEX IF NOT EXISTS books_genre_idx ON books (genre);

-- Update the find_similar_books function to include genre in results
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
  similarity REAL
) AS $$
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
  WHERE 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find books by genre
CREATE OR REPLACE FUNCTION find_books_by_genre(
  genre_filter TEXT,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  description TEXT,
  themes TEXT[],
  genre TEXT,
  sarah_assessment TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.description,
    b.themes,
    b.genre,
    b.sarah_assessment
  FROM books b
  WHERE b.genre ILIKE '%' || genre_filter || '%'
  ORDER BY b.title
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find books by author
CREATE OR REPLACE FUNCTION find_books_by_author(
  author_filter TEXT,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  description TEXT,
  themes TEXT[],
  genre TEXT,
  sarah_assessment TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.description,
    b.themes,
    b.genre,
    b.sarah_assessment
  FROM books b
  WHERE b.author ILIKE '%' || author_filter || '%'
  ORDER BY b.title
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
