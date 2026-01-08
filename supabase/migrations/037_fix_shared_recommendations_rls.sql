-- Fix RLS for shared recommendations
-- Allow anonymous users to view user_recommendations that have been shared via shared_recommendations

-- Add policy to allow viewing recommendations that have been shared publicly
CREATE POLICY "Anyone can view shared user_recommendations"
  ON user_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_recommendations
      WHERE shared_recommendations.recommendation_id = user_recommendations.id
    )
  );

-- Also allow anonymous users to update view_count on shared_recommendations
CREATE POLICY "Anyone can update view count on shared recommendations"
  ON shared_recommendations FOR UPDATE
  USING (true)
  WITH CHECK (true);
