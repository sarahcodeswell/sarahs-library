-- Add is_active column to reading_queue for Active vs On Hold functionality
-- This allows readers to distinguish between books they're actively reading
-- vs books they've started but paused

-- Add the column with default true (all existing reading books are "active")
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set all existing 'reading' status books to active
UPDATE reading_queue 
SET is_active = true 
WHERE status = 'reading' AND is_active IS NULL;

-- Add index for efficient querying of active reading books
CREATE INDEX IF NOT EXISTS idx_reading_queue_is_active 
ON reading_queue (user_id, status, is_active) 
WHERE status = 'reading';

COMMENT ON COLUMN reading_queue.is_active IS 'For reading status: true = Reading Now (active), false = On Hold (paused)';
