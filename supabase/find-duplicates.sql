-- Find duplicate books in reading_queue for Sarah
-- Shows books that appear multiple times

SELECT 
  book_title,
  book_author,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(rating::text, ', ') as ratings
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  AND status = 'finished'
GROUP BY book_title, book_author
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, book_title;
