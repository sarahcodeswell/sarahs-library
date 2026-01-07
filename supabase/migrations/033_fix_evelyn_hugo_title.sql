-- Fix corrupted book title for The Seven Husbands of Evelyn Hugo
-- The title appears to be corrupted to "The Seven Husbands of Hearst Taylor" in the database

-- First, check if the corruption exists
SELECT title, author FROM books 
WHERE title LIKE '%Seven Husbands%' OR title LIKE '%Evelyn Hugo%';

-- Fix the title if it's corrupted
UPDATE books 
SET title = 'The Seven Husbands of Evelyn Hugo',
    author = 'Taylor Jenkins Reid'
WHERE title LIKE '%Seven Husbands%' 
  AND (title != 'The Seven Husbands of Evelyn Hugo' OR author != 'Taylor Jenkins Reid');

-- Verify the fix
SELECT title, author, themes FROM books 
WHERE title = 'The Seven Husbands of Evelyn Hugo';
