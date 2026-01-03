-- Add ISBN columns to books table for reliable book identification
-- This enables exact book lookups and prevents title hallucination issues

-- Add ISBN columns
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn13 TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn10 TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add unique constraint on ISBN13 (primary identifier)
ALTER TABLE books ADD CONSTRAINT books_isbn13_unique UNIQUE (isbn13);

-- Add indexes for ISBN lookups
CREATE INDEX IF NOT EXISTS books_isbn13_idx ON books(isbn13) WHERE isbn13 IS NOT NULL;
CREATE INDEX IF NOT EXISTS books_isbn10_idx ON books(isbn10) WHERE isbn10 IS NOT NULL;

-- Function to find book by ISBN (exact match)
CREATE OR REPLACE FUNCTION find_book_by_isbn(isbn13 TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  genre TEXT,
  description TEXT,
  themes TEXT[],
  sarah_assessment TEXT,
  isbn13 TEXT,
  isbn10 TEXT,
  cover_url TEXT,
  embedding vector(1536)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.genre,
    b.description,
    b.themes,
    b.sarah_assessment,
    b.isbn13,
    b.isbn10,
    b.cover_url,
    b.embedding
  FROM books b
  WHERE b.isbn13 = isbn13;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE books IS 'Enhanced with ISBN for reliable book identification';
COMMENT ON COLUMN books.isbn13 IS 'ISBN-13: Primary book identifier';
COMMENT ON COLUMN books.isbn10 IS 'ISBN-10: Legacy identifier';
COMMENT ON COLUMN books.cover_url IS 'Cover image URL from Google Books';
