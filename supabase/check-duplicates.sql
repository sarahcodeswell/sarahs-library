-- Check for duplicate books in reading_queue
-- Run this in Supabase SQL Editor to see if there are any duplicates

SELECT 
  book_title,
  book_author,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as book_ids,
  ARRAY_AGG(status) as statuses,
  ARRAY_AGG(added_at) as added_dates
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
GROUP BY book_title, book_author
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, book_title;

-- If duplicates exist, this query will show them
-- To remove duplicates (keeping the oldest entry), run:
/*
DELETE FROM reading_queue
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, book_title, book_author ORDER BY added_at ASC) as rn
    FROM reading_queue
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  ) t
  WHERE rn > 1
);
*/
