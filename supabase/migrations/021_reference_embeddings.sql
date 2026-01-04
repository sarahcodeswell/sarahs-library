-- Reference Embeddings Table for Deterministic Query Router
-- Stores pre-computed embeddings for taste alignment scoring
-- 
-- This enables Stage 2 of the deterministic router:
-- - Sarah's taste centroid (average of all book embeddings)
-- - Theme centroids (average embedding per theme)
-- - Genre centroids (average embedding per genre)
-- - Anti-pattern embeddings (escapism, plot-over-character, formulaic)

CREATE TABLE IF NOT EXISTS reference_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL, -- 'taste_centroid', 'theme', 'genre', 'anti_pattern'
  reference_name TEXT NOT NULL, -- 'sarahs_taste', 'women', 'literary_fiction', 'pure_escapism', etc.
  embedding vector(1536) NOT NULL,
  source_book_count INTEGER, -- How many books contributed to this centroid
  metadata JSONB, -- Additional info (e.g., which books, computation details)
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_reference UNIQUE(reference_type, reference_name)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reference_embeddings_type ON reference_embeddings(reference_type);
CREATE INDEX IF NOT EXISTS idx_reference_embeddings_name ON reference_embeddings(reference_name);

-- Function to get all reference embeddings as a single JSON object
-- This is what the router loads at startup
CREATE OR REPLACE FUNCTION get_reference_embeddings()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sarahs_taste_centroid', (
      SELECT embedding::text::jsonb 
      FROM reference_embeddings 
      WHERE reference_type = 'taste_centroid' AND reference_name = 'sarahs_taste'
    ),
    'themes', (
      SELECT jsonb_object_agg(reference_name, embedding::text::jsonb)
      FROM reference_embeddings 
      WHERE reference_type = 'theme'
    ),
    'genres', (
      SELECT jsonb_object_agg(reference_name, embedding::text::jsonb)
      FROM reference_embeddings 
      WHERE reference_type = 'genre'
    ),
    'antiPatterns', (
      SELECT jsonb_object_agg(reference_name, embedding::text::jsonb)
      FROM reference_embeddings 
      WHERE reference_type = 'anti_pattern'
    ),
    'computed_at', (
      SELECT MAX(computed_at) FROM reference_embeddings
    ),
    'book_count', (
      SELECT source_book_count 
      FROM reference_embeddings 
      WHERE reference_type = 'taste_centroid' AND reference_name = 'sarahs_taste'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute and store Sarah's taste centroid from books table
CREATE OR REPLACE FUNCTION compute_taste_centroid()
RETURNS void AS $$
DECLARE
  centroid vector(1536);
  book_count INTEGER;
BEGIN
  -- Compute average of all book embeddings
  SELECT 
    AVG(embedding)::vector(1536),
    COUNT(*)
  INTO centroid, book_count
  FROM books
  WHERE embedding IS NOT NULL;
  
  -- Upsert the centroid
  INSERT INTO reference_embeddings (reference_type, reference_name, embedding, source_book_count, computed_at)
  VALUES ('taste_centroid', 'sarahs_taste', centroid, book_count, NOW())
  ON CONFLICT (reference_type, reference_name) 
  DO UPDATE SET 
    embedding = EXCLUDED.embedding,
    source_book_count = EXCLUDED.source_book_count,
    computed_at = NOW();
    
  RAISE NOTICE 'Computed taste centroid from % books', book_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute and store theme centroids
CREATE OR REPLACE FUNCTION compute_theme_centroids()
RETURNS void AS $$
DECLARE
  theme_name TEXT;
  theme_centroid vector(1536);
  theme_count INTEGER;
BEGIN
  -- Process each theme
  FOR theme_name IN SELECT DISTINCT unnest(themes) FROM books WHERE themes IS NOT NULL
  LOOP
    -- Compute centroid for this theme
    SELECT 
      AVG(embedding)::vector(1536),
      COUNT(*)
    INTO theme_centroid, theme_count
    FROM books
    WHERE embedding IS NOT NULL
      AND themes @> ARRAY[theme_name];
    
    -- Upsert the theme centroid
    INSERT INTO reference_embeddings (reference_type, reference_name, embedding, source_book_count, computed_at)
    VALUES ('theme', theme_name, theme_centroid, theme_count, NOW())
    ON CONFLICT (reference_type, reference_name) 
    DO UPDATE SET 
      embedding = EXCLUDED.embedding,
      source_book_count = EXCLUDED.source_book_count,
      computed_at = NOW();
      
    RAISE NOTICE 'Computed centroid for theme "%" from % books', theme_name, theme_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute and store genre centroids
CREATE OR REPLACE FUNCTION compute_genre_centroids()
RETURNS void AS $$
DECLARE
  genre_name TEXT;
  genre_key TEXT;
  genre_centroid vector(1536);
  genre_count INTEGER;
BEGIN
  -- Process each genre
  FOR genre_name IN SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL
  LOOP
    -- Create a normalized key (lowercase, underscores)
    genre_key := lower(regexp_replace(genre_name, '[^a-zA-Z0-9]+', '_', 'g'));
    
    -- Compute centroid for this genre
    SELECT 
      AVG(embedding)::vector(1536),
      COUNT(*)
    INTO genre_centroid, genre_count
    FROM books
    WHERE embedding IS NOT NULL
      AND genre = genre_name;
    
    -- Upsert the genre centroid
    INSERT INTO reference_embeddings (reference_type, reference_name, embedding, source_book_count, computed_at)
    VALUES ('genre', genre_key, genre_centroid, genre_count, NOW())
    ON CONFLICT (reference_type, reference_name) 
    DO UPDATE SET 
      embedding = EXCLUDED.embedding,
      source_book_count = EXCLUDED.source_book_count,
      computed_at = NOW();
      
    RAISE NOTICE 'Computed centroid for genre "%" (%) from % books', genre_name, genre_key, genre_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users (read-only)
ALTER TABLE reference_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference embeddings are readable by all" ON reference_embeddings
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify reference embeddings" ON reference_embeddings
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE reference_embeddings IS 'Pre-computed reference embeddings for deterministic query routing';
COMMENT ON COLUMN reference_embeddings.reference_type IS 'Type: taste_centroid, theme, genre, anti_pattern';
COMMENT ON COLUMN reference_embeddings.reference_name IS 'Name: sarahs_taste, women, literary_fiction, pure_escapism, etc.';
