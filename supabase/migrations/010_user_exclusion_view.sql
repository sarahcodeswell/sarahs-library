-- Create materialized view for fast exclusion list lookups
-- This pre-computes which books each user should NOT be recommended
-- by combining data from reading_queue and dismissed_recommendations

CREATE MATERIALIZED VIEW user_exclusion_list AS
SELECT 
  user_id,
  book_title,
  MAX(created_at) as last_interaction,
  ARRAY_AGG(DISTINCT source_table) as sources
FROM (
  -- Books from reading queue (all statuses)
  SELECT 
    user_id,
    book_title,
    added_at as created_at,
    'reading_queue' as source_table
  FROM reading_queue
  
  UNION ALL
  
  -- Dismissed recommendations
  SELECT 
    user_id,
    book_title,
    created_at,
    'dismissed' as source_table
  FROM dismissed_recommendations
) combined
GROUP BY user_id, book_title;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_exclusion_user_book ON user_exclusion_list(user_id, book_title);
CREATE INDEX idx_exclusion_user ON user_exclusion_list(user_id);

-- Grant access to authenticated users
ALTER MATERIALIZED VIEW user_exclusion_list OWNER TO postgres;

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_exclusion_list()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_exclusion_list;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh when reading_queue changes
CREATE TRIGGER refresh_exclusion_on_queue_change
AFTER INSERT OR UPDATE OR DELETE ON reading_queue
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_exclusion_list();

-- Trigger to refresh when dismissed_recommendations changes
CREATE TRIGGER refresh_exclusion_on_dismiss_change
AFTER INSERT OR UPDATE OR DELETE ON dismissed_recommendations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_exclusion_list();

-- Initial refresh
REFRESH MATERIALIZED VIEW user_exclusion_list;
