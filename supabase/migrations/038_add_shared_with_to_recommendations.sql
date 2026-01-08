-- Add shared_with field to track who the recommendation was sent to
ALTER TABLE user_recommendations 
ADD COLUMN IF NOT EXISTS shared_with TEXT;

-- Add comment for clarity
COMMENT ON COLUMN user_recommendations.shared_with IS 'Optional: Name or identifier of who this recommendation was shared with';
