-- Add rating column to reading_queue table
-- Allows users to rate books in their collection (finished books)

ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_reading_queue_rating ON reading_queue(rating) WHERE rating IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN reading_queue.rating IS 'User rating for the book (1-5 stars, nullable)';
