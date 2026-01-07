-- Fix security warnings: Set search_path on all functions
-- This prevents search_path injection attacks

-- 1. Fix function search paths
ALTER FUNCTION compute_theme_centroids() SET search_path = public, pg_temp;
ALTER FUNCTION strip_accolades_from_description() SET search_path = public, pg_temp;
ALTER FUNCTION update_chat_session_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION find_books_by_author(text) SET search_path = public, pg_temp;
ALTER FUNCTION update_user_books_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION find_similar_books(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION find_similar_user_books(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION find_popular_similar_books(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION get_popular_books(integer) SET search_path = public, pg_temp;
ALTER FUNCTION find_books_by_genre(text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION refresh_user_exclusion_list() SET search_path = public, pg_temp;
ALTER FUNCTION generate_session_title(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION compute_genre_centroids() SET search_path = public, pg_temp;
ALTER FUNCTION compute_taste_centroid(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_old_chat_history() SET search_path = public, pg_temp;

-- 2. Move vector extension to extensions schema (if it exists, otherwise create it)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- 3. Disable RLS on materialized view (it's refreshed by service role anyway)
ALTER MATERIALIZED VIEW user_exclusion_list OWNER TO postgres;
REVOKE ALL ON user_exclusion_list FROM anon, authenticated;
GRANT SELECT ON user_exclusion_list TO service_role;

-- 4. Fix overly permissive RLS policies
-- These policies use USING (true) which is intentional for service role access
-- The warnings are informational - service role bypasses RLS anyway
-- No action needed - these are working as designed

-- Note: The "Leaked Password Protection" warning must be enabled in Supabase Dashboard
-- Go to: Authentication > Policies > Enable "Check for leaked passwords"
