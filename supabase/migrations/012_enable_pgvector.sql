-- Enable pgvector extension for vector similarity search
-- This allows us to store and search book embeddings

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the books table with vector support
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  themes TEXT[], -- Array of themes
  sarah_assessment TEXT, -- Sarah's personal assessment
  embedding vector(1536), -- OpenAI embeddings dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient vector search
CREATE INDEX IF NOT EXISTS books_embedding_idx ON books USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create HNSW index for better performance on smaller datasets
CREATE INDEX IF NOT EXISTS books_embedding_hnsw_idx ON books USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- RLS policies - books are readable by all authenticated users
CREATE POLICY "Books are viewable by authenticated users" ON books
  FOR SELECT USING (auth.role() = 'authenticated');

-- Books are insertable/updateable by admin only
CREATE POLICY "Only admin can manage books" ON books
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    auth.email() = 'sarah@darkridge.com'
  );

-- Function to find similar books by embedding
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
    b.sarah_assessment,
    1 - (b.embedding <=> query_embedding) as similarity
  FROM books b
  WHERE 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
