-- Add unique constraint on title for books table
-- This allows upsert operations to work correctly

ALTER TABLE books ADD CONSTRAINT books_title_unique UNIQUE (title);
