-- Fix reading_queue RLS policy for INSERT operations
-- The FOR ALL policy with only USING clause doesn't work for INSERT
-- Need to add WITH CHECK clause for INSERT to work properly

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage their own reading queue" ON reading_queue;

-- Drop old individual policies if they exist
DROP POLICY IF EXISTS "Users can view own reading queue" ON reading_queue;
DROP POLICY IF EXISTS "Users can insert to own reading queue" ON reading_queue;
DROP POLICY IF EXISTS "Users can update own reading queue" ON reading_queue;
DROP POLICY IF EXISTS "Users can delete from own reading queue" ON reading_queue;

-- Create proper policies for each operation
CREATE POLICY "Users can view own reading queue" ON reading_queue
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert to own reading queue" ON reading_queue
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own reading queue" ON reading_queue
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete from own reading queue" ON reading_queue
  FOR DELETE USING ((select auth.uid()) = user_id);
