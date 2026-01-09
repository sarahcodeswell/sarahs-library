-- Add reputation column to reading_queue for storing book accolades/awards
-- This column stores reputation data like "NYT Bestseller", "Pulitzer Prize Winner", etc.

ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS reputation TEXT;

COMMENT ON COLUMN reading_queue.reputation IS 'Book reputation/accolades (e.g., NYT Bestseller, award winner)';
