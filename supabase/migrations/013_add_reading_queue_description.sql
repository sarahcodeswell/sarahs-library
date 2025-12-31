-- Add description and why_recommended columns to reading_queue table
-- These store the book details from recommendations so users can see them later

ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS why_recommended TEXT;

-- Add comment for documentation
COMMENT ON COLUMN reading_queue.description IS 'Book description from recommendation';
COMMENT ON COLUMN reading_queue.why_recommended IS 'Why this book was recommended to the user';
