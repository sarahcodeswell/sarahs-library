-- Optimize RLS policies for performance
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- Replace auth.role() with (select auth.role()) to avoid re-evaluation per row

-- Drop and recreate all RLS policies with optimized auth function calls

-- taste_profiles
DROP POLICY IF EXISTS "Users can manage their own taste profile" ON taste_profiles;
CREATE POLICY "Users can manage their own taste profile" ON taste_profiles
  FOR ALL USING ((select auth.uid()) = user_id);

-- reading_queue  
DROP POLICY IF EXISTS "Users can manage their own reading queue" ON reading_queue;
CREATE POLICY "Users can manage their own reading queue" ON reading_queue
  FOR ALL USING ((select auth.uid()) = user_id);

-- user_events
DROP POLICY IF EXISTS "Users can view own events" ON user_events;
CREATE POLICY "Users can view own events" ON user_events
  FOR SELECT USING ((select auth.uid()) = user_id);

-- book_interactions
DROP POLICY IF EXISTS "Users can view own book interactions" ON book_interactions;
CREATE POLICY "Users can view own book interactions" ON book_interactions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- search_queries
DROP POLICY IF EXISTS "Users can view own searches" ON search_queries;
CREATE POLICY "Users can view own searches" ON search_queries
  FOR SELECT USING ((select auth.uid()) = user_id);

-- theme_interactions
DROP POLICY IF EXISTS "Users can view own theme interactions" ON theme_interactions;
CREATE POLICY "Users can view own theme interactions" ON theme_interactions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- user_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- chat_sessions
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- chat_messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_books
DROP POLICY IF EXISTS "Users can view own books" ON user_books;
DROP POLICY IF EXISTS "Users can insert own books" ON user_books;
DROP POLICY IF EXISTS "Users can update own books" ON user_books;
DROP POLICY IF EXISTS "Users can delete own books" ON user_books;

CREATE POLICY "Users can view own books" ON user_books
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own books" ON user_books
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own books" ON user_books
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own books" ON user_books
  FOR DELETE USING ((select auth.uid()) = user_id);

-- user_recommendations
DROP POLICY IF EXISTS "Users can view own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can create own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can delete own recommendations" ON user_recommendations;

CREATE POLICY "Users can view own recommendations" ON user_recommendations
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create own recommendations" ON user_recommendations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own recommendations" ON user_recommendations
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own recommendations" ON user_recommendations
  FOR DELETE USING ((select auth.uid()) = user_id);

-- shared_recommendations
DROP POLICY IF EXISTS "Users can create shares for own recommendations" ON shared_recommendations;
DROP POLICY IF EXISTS "Users can update own shares" ON shared_recommendations;

CREATE POLICY "Users can create shares for own recommendations" ON shared_recommendations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_recommendations
      WHERE id = recommendation_id AND user_id = (select auth.uid())
    )
  );
CREATE POLICY "Users can update own shares" ON shared_recommendations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_recommendations
      WHERE id = recommendation_id AND user_id = (select auth.uid())
    )
  );

-- dismissed_recommendations
DROP POLICY IF EXISTS "Users can view own dismissed recommendations" ON dismissed_recommendations;
DROP POLICY IF EXISTS "Users can insert own dismissed recommendations" ON dismissed_recommendations;
DROP POLICY IF EXISTS "Users can delete own dismissed recommendations" ON dismissed_recommendations;

CREATE POLICY "Users can view own dismissed recommendations" ON dismissed_recommendations
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own dismissed recommendations" ON dismissed_recommendations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own dismissed recommendations" ON dismissed_recommendations
  FOR DELETE USING ((select auth.uid()) = user_id);

-- chat_history
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON chat_history;

CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own chat history" ON chat_history
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own chat history" ON chat_history
  FOR DELETE USING ((select auth.uid()) = user_id);

-- books (admin only)
DROP POLICY IF EXISTS "Only admin can manage books" ON books;
CREATE POLICY "Only admin can manage books" ON books
  FOR ALL USING ((select auth.jwt()) ->> 'email' = 'sarah@darkridge.com');

-- recommendation_outcomes
DROP POLICY IF EXISTS "Users can view own recommendation outcomes" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Users can insert own recommendation outcomes" ON recommendation_outcomes;

CREATE POLICY "Users can view own recommendation outcomes" ON recommendation_outcomes
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own recommendation outcomes" ON recommendation_outcomes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- reference_embeddings
DROP POLICY IF EXISTS "Only service role can modify reference embeddings" ON reference_embeddings;
CREATE POLICY "Only service role can modify reference embeddings" ON reference_embeddings
  FOR ALL USING ((select auth.role()) = 'service_role');

-- referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Service role can manage referrals" ON referrals;

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING ((select auth.uid()) = inviter_id);
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Fix duplicate indexes
DROP INDEX IF EXISTS idx_reading_queue_user_id; -- Keep reading_queue_user_id_idx
DROP INDEX IF EXISTS idx_shared_recommendations_rec_id; -- Keep idx_shared_recommendations_recommendation_id
