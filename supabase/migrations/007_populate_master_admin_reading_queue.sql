-- Populate Master Admin's reading queue with all 200 curated books from books.json
-- This ensures recommendations don't include books already in the collection
-- Run this migration after books.json is loaded into the application

-- Note: This migration should be run manually after deployment
-- The books data needs to be inserted via the application or a separate script
-- since SQL migrations can't directly read from books.json

-- For now, this is a placeholder migration that documents the approach
-- The actual population will be done via the application on first Master Admin login

-- Create a function to populate Master Admin's reading queue
CREATE OR REPLACE FUNCTION populate_master_admin_reading_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  master_admin_id uuid;
BEGIN
  -- Get Master Admin user ID
  SELECT id INTO master_admin_id
  FROM auth.users
  WHERE email = 'sarah@darkridge.com'
  LIMIT 1;

  IF master_admin_id IS NULL THEN
    RAISE NOTICE 'Master Admin user not found';
    RETURN;
  END IF;

  -- Note: Books will be inserted via application code
  -- This function is a placeholder for documentation
  RAISE NOTICE 'Master Admin reading queue should be populated via application code';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_master_admin_reading_queue() TO authenticated;

COMMENT ON FUNCTION populate_master_admin_reading_queue() IS 
'Placeholder function to document the approach for populating Master Admin reading queue with curated books from books.json';
