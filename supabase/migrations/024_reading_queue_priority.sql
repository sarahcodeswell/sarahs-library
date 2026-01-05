-- Reading Queue V2: Add ownership tracking and priority ordering
-- This transforms the reading queue from a flat list to a prioritized stack

-- Add ownership tracking (does user own this book?)
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS owned BOOLEAN DEFAULT false;

-- Add priority for ordering (lower = higher priority, 1 = top of queue)
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Set initial priorities based on created_at (oldest = highest priority)
-- Only for 'saved' status items that don't have a priority yet
UPDATE reading_queue 
SET priority = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM reading_queue
  WHERE status = 'saved' AND priority IS NULL
) as subquery
WHERE reading_queue.id = subquery.id;

-- Index for efficient ordering by user and priority
CREATE INDEX IF NOT EXISTS idx_reading_queue_user_priority 
ON reading_queue(user_id, status, priority);

-- Comment for documentation
COMMENT ON COLUMN reading_queue.owned IS 'Whether the user owns this book (true) or needs to acquire it (false)';
COMMENT ON COLUMN reading_queue.priority IS 'Priority order within status group (1 = highest priority, top of queue)';
