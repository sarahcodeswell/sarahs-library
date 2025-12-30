-- Check if ratings are being saved in reading_queue
-- Run this in Supabase SQL Editor to see your ratings

SELECT 
  book_title,
  book_author,
  rating,
  status,
  added_at
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  AND rating IS NOT NULL
ORDER BY added_at DESC
LIMIT 20;

-- Count total books with ratings
SELECT COUNT(*) as books_with_ratings
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  AND rating IS NOT NULL;
