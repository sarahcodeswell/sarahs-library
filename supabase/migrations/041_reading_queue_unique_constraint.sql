-- Add unique constraint to reading_queue to prevent duplicate books per user
-- This prevents issues when users upload the same Goodreads CSV multiple times

-- First, remove duplicates keeping the oldest entry (by added_at)
-- This will clean up Heather's 374 -> 187 books
DELETE FROM reading_queue a
USING reading_queue b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND LOWER(TRIM(a.book_title)) = LOWER(TRIM(b.book_title))
  AND LOWER(COALESCE(TRIM(a.book_author), '')) = LOWER(COALESCE(TRIM(b.book_author), ''));

-- Create a unique index on (user_id, normalized title, normalized author)
-- Using a functional index to handle case-insensitivity
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_queue_unique_book 
ON reading_queue (user_id, LOWER(TRIM(book_title)), LOWER(COALESCE(TRIM(book_author), '')));
