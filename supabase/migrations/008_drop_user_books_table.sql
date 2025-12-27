-- Drop the redundant user_books table
-- This table was used as a staging area for photo/manual entry
-- but reading_queue now handles all book tracking
-- Books were moved from user_books to reading_queue when marked as "Read" or "Want to Read"

-- Drop the table and all its dependencies
DROP TABLE IF EXISTS user_books CASCADE;

-- Remove the update trigger function (no longer needed)
DROP FUNCTION IF EXISTS update_user_books_updated_at();
