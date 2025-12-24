-- Database Optimization: Add indexes for better query performance
-- Run this migration in your Supabase SQL Editor

-- Index for reading_queue queries by user_id (most common query)
-- This speeds up: SELECT * FROM reading_queue WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_reading_queue_user_id 
ON reading_queue(user_id);

-- Composite index for user_id + status queries
-- This speeds up: SELECT * FROM reading_queue WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_reading_queue_user_status 
ON reading_queue(user_id, status);

-- Index for ordering by added_at (used in getReadingQueue)
-- This speeds up: ORDER BY added_at DESC
CREATE INDEX IF NOT EXISTS idx_reading_queue_added_at 
ON reading_queue(added_at DESC);

-- Composite index for user_id + added_at (optimal for common query pattern)
-- This speeds up: SELECT * FROM reading_queue WHERE user_id = ? ORDER BY added_at DESC
CREATE INDEX IF NOT EXISTS idx_reading_queue_user_added 
ON reading_queue(user_id, added_at DESC);

-- Index for taste_profiles queries by user_id
-- This speeds up: SELECT * FROM taste_profiles WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_taste_profiles_user_id 
ON taste_profiles(user_id);

-- Add updated_at index for potential future queries
CREATE INDEX IF NOT EXISTS idx_taste_profiles_updated_at 
ON taste_profiles(updated_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE reading_queue;
ANALYZE taste_profiles;
