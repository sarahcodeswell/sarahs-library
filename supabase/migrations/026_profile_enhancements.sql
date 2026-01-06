-- Profile enhancements: age, location, genres, favorite bookstore

-- Add new columns to taste_profiles
ALTER TABLE taste_profiles 
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS favorite_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS favorite_bookstore_name TEXT,
ADD COLUMN IF NOT EXISTS favorite_bookstore_place_id TEXT,
ADD COLUMN IF NOT EXISTS favorite_bookstore_address TEXT;

-- Add constraint for COPPA compliance (users must be 13+)
-- We store birth_year, and the app will calculate age and enforce restrictions
-- Birth year must be reasonable (not in future, not impossibly old)
ALTER TABLE taste_profiles
ADD CONSTRAINT birth_year_reasonable 
CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM NOW())));
