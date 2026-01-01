-- Add ISBN and cover image columns to reading_queue
-- Migration: 004_add_isbn_and_cover.sql

ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS isbn TEXT,
ADD COLUMN IF NOT EXISTS isbn10 TEXT,
ADD COLUMN IF NOT EXISTS isbn13 TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS open_library_key TEXT,
ADD COLUMN IF NOT EXISTS first_publish_year INTEGER;

-- Index for ISBN lookups
CREATE INDEX IF NOT EXISTS idx_reading_queue_isbn ON reading_queue(isbn);
