-- Fix RLS on books table to allow public read access
-- The books catalog should be readable by everyone (signed in or not)
-- Only modifications should be restricted to admin

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Books are viewable by authenticated users" ON books;

-- Create new policy allowing public read access
CREATE POLICY "Books are viewable by everyone" ON books
  FOR SELECT USING (true);

-- Keep the admin-only write policy (if it doesn't exist, create it)
DROP POLICY IF EXISTS "Only admin can manage books" ON books;

CREATE POLICY "Only admin can manage books" ON books
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.email() = 'sarah@darkridge.com'
  );

CREATE POLICY "Only admin can update books" ON books
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    auth.email() = 'sarah@darkridge.com'
  );

CREATE POLICY "Only admin can delete books" ON books
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    auth.email() = 'sarah@darkridge.com'
  );
