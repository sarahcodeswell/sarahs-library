-- Add reading_preferences column to auth.users metadata
-- This will store user's reading taste and interests as text

-- Note: Supabase auth.users table uses jsonb metadata field
-- We'll store reading preferences in the user_metadata jsonb field
-- No migration needed - we'll handle this in the application code

-- Create a view to access user preferences if needed
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'reading_preferences' as reading_preferences
FROM auth.users;

-- Grant access to authenticated users
GRANT SELECT ON public.user_profiles TO authenticated;

-- Enable RLS
ALTER VIEW public.user_profiles SET (security_invoker = on);
