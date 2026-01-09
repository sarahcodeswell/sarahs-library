-- Fix books table RLS to allow public read access
-- Migration 030 accidentally restricted read access with FOR ALL policy
-- This restores the intended behavior: anyone can read, only admin can write

-- Drop the overly restrictive policy from migration 030
DROP POLICY IF EXISTS "Only admin can manage books" ON books;

-- Restore public read access (from migration 022)
DROP POLICY IF EXISTS "Books are viewable by everyone" ON books;
CREATE POLICY "Books are viewable by everyone" ON books
  FOR SELECT USING (true);

-- Separate policies for admin write operations
DROP POLICY IF EXISTS "Only admin can insert books" ON books;
CREATE POLICY "Only admin can insert books" ON books
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'email') = 'sarah@darkridge.com'
  );

DROP POLICY IF EXISTS "Only admin can update books" ON books;
CREATE POLICY "Only admin can update books" ON books
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'email') = 'sarah@darkridge.com'
  );

DROP POLICY IF EXISTS "Only admin can delete books" ON books;
CREATE POLICY "Only admin can delete books" ON books
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'email') = 'sarah@darkridge.com'
  );

-- Also ensure the find_similar_books function has proper security
-- It should be accessible to anon users for recommendations
GRANT EXECUTE ON FUNCTION find_similar_books(vector(1536), INT, REAL) TO anon;
GRANT EXECUTE ON FUNCTION find_similar_books(vector(1536), INT, REAL) TO authenticated;
