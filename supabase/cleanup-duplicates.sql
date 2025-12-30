-- Clean up duplicate books in reading_queue
-- Keeps the entry with a rating (if any), or the most recent one
-- Run this after reviewing find-duplicates.sql results

WITH ranked_books AS (
  SELECT 
    id,
    book_title,
    book_author,
    rating,
    added_at,
    ROW_NUMBER() OVER (
      PARTITION BY book_title, book_author 
      ORDER BY 
        CASE WHEN rating IS NOT NULL THEN 0 ELSE 1 END,  -- Prioritize entries with ratings
        added_at DESC  -- Then most recent
    ) as rn
  FROM reading_queue
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
    AND status = 'finished'
)
DELETE FROM reading_queue
WHERE id IN (
  SELECT id 
  FROM ranked_books 
  WHERE rn > 1
);

-- Show what remains
SELECT 
  book_title,
  book_author,
  rating,
  added_at
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  AND status = 'finished'
ORDER BY book_title;
