-- Verify the materialized view is working correctly

-- 1. Check current status distribution in reading_queue
SELECT status, COUNT(*) as count
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
GROUP BY status;

-- 2. Check what's in the materialized view for your user
SELECT COUNT(*) as total_excluded_books
FROM user_exclusion_list
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com');

-- 3. Show sample of excluded books
SELECT book_title, sources
FROM user_exclusion_list
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
LIMIT 10;

-- 4. Manually refresh the materialized view (in case triggers didn't fire)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_exclusion_list;

-- 5. Check again after refresh
SELECT COUNT(*) as total_excluded_books_after_refresh
FROM user_exclusion_list
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com');
