-- Add rating column to user_books table
-- Allows users to rate books in their collection on a 1-5 scale

ALTER TABLE user_books 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_user_books_rating ON user_books(rating) WHERE rating IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_books.rating IS 'User rating for the book (1-5 stars, nullable)';
