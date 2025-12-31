-- Add 'reading_queue' as an allowed value for added_via column in user_books table
-- This allows books marked as "Finished" in the reading queue to be added to user's collection

-- Drop the existing constraint
ALTER TABLE user_books DROP CONSTRAINT IF EXISTS user_books_added_via_check;

-- Add the new constraint with 'reading_queue' included
ALTER TABLE user_books ADD CONSTRAINT user_books_added_via_check 
  CHECK (added_via IN ('photo', 'manual', 'import', 'reading_queue'));
