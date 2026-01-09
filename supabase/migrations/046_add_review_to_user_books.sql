-- Add review column to user_books for storing user reviews
-- Reviews are optional text that users can add when adding a book to their collection

ALTER TABLE user_books 
ADD COLUMN IF NOT EXISTS review TEXT;

COMMENT ON COLUMN user_books.review IS 'User review/thoughts about the book (optional)';
