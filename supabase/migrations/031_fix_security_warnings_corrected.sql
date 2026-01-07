-- Fix security warnings: Set search_path on functions that actually exist
-- Skip functions that don't exist in the database

-- Fix function search paths (only for functions that exist)
DO $$
BEGIN
  -- Check and alter each function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'compute_theme_centroids') THEN
    ALTER FUNCTION compute_theme_centroids() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_chat_session_timestamp') THEN
    ALTER FUNCTION update_chat_session_timestamp() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_books_by_author') THEN
    ALTER FUNCTION find_books_by_author(text) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_books_updated_at') THEN
    ALTER FUNCTION update_user_books_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_similar_books') THEN
    ALTER FUNCTION find_similar_books(uuid, integer) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_similar_user_books') THEN
    ALTER FUNCTION find_similar_user_books(uuid, integer) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_popular_similar_books') THEN
    ALTER FUNCTION find_popular_similar_books(uuid, integer) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_popular_books') THEN
    ALTER FUNCTION get_popular_books(integer) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_books_by_genre') THEN
    ALTER FUNCTION find_books_by_genre(text, integer) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_user_exclusion_list') THEN
    ALTER FUNCTION refresh_user_exclusion_list() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_session_title') THEN
    ALTER FUNCTION generate_session_title(uuid) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'compute_genre_centroids') THEN
    ALTER FUNCTION compute_genre_centroids() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'compute_taste_centroid') THEN
    ALTER FUNCTION compute_taste_centroid(uuid) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_chat_history') THEN
    ALTER FUNCTION cleanup_old_chat_history() SET search_path = public, pg_temp;
  END IF;
END $$;

-- Move vector extension to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Restrict materialized view access
ALTER MATERIALIZED VIEW user_exclusion_list OWNER TO postgres;
REVOKE ALL ON user_exclusion_list FROM anon, authenticated;
GRANT SELECT ON user_exclusion_list TO service_role;
