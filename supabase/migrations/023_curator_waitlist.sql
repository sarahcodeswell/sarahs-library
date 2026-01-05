-- Curator waitlist for email signups
CREATE TABLE IF NOT EXISTS curator_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE curator_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (signup)
CREATE POLICY "Anyone can join waitlist" ON curator_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read
CREATE POLICY "Service role can read waitlist" ON curator_waitlist
  FOR SELECT TO service_role
  USING (true);
