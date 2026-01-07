-- Create beta_testers table for Read with Friends feature signups
CREATE TABLE IF NOT EXISTS beta_testers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  interested_features TEXT[], -- Array of features they're interested in
  feedback TEXT, -- Optional feedback/comments
  notified BOOLEAN DEFAULT FALSE, -- Whether they've been notified about beta launch
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_beta_testers_user_id ON beta_testers(user_id);
CREATE INDEX idx_beta_testers_email ON beta_testers(email);
CREATE INDEX idx_beta_testers_notified ON beta_testers(notified) WHERE notified = FALSE;

-- RLS Policies
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;

-- Users can insert their own beta signup
CREATE POLICY "Users can sign up for beta"
  ON beta_testers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IS NULL -- Allow anonymous signups with just email
  );

-- Users can view their own beta signup
CREATE POLICY "Users can view own beta signup"
  ON beta_testers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view all beta signups (add admin check later)
CREATE POLICY "Service role can manage beta testers"
  ON beta_testers
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE beta_testers IS 'Users who signed up to beta test the Read with Friends feature';
