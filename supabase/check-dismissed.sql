-- Check if dismissed_recommendations table exists and has data
SELECT COUNT(*) as dismissed_count 
FROM dismissed_recommendations;

-- Check if dismissed books are in the exclusion list
SELECT 
  user_id,
  book_title,
  sources
FROM user_exclusion_list
WHERE 'dismissed' = ANY(sources)
LIMIT 10;

-- Check if materialized view needs refresh
SELECT 
  schemaname,
  matviewname,
  matviewowner,
  tablespace,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE matviewname = 'user_exclusion_list';
