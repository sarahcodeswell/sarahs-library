-- Unified referral codes table
-- Stores referral codes by email, allowing codes to be generated before user signup
-- and linked to user_id when they create an account

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'profile' CHECK (source IN ('curator_waitlist', 'beta_signup', 'profile', 'invite')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  linked_at TIMESTAMPTZ  -- When user_id was linked (i.e., when they signed up)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_email ON referral_codes(email);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can look up a referral code (needed for attribution on signup)
CREATE POLICY "Public can read referral codes" ON referral_codes
  FOR SELECT USING (true);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role can manage referral codes" ON referral_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Migrate existing referral codes from taste_profiles
-- This preserves existing codes and links them to users
INSERT INTO referral_codes (email, code, user_id, source, created_at, linked_at)
SELECT 
  u.email,
  tp.referral_code,
  tp.user_id,
  'profile',
  tp.created_at,
  tp.created_at
FROM taste_profiles tp
JOIN auth.users u ON u.id = tp.user_id
WHERE tp.referral_code IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Note: We keep taste_profiles.referral_code for now for backward compatibility
-- but new code should use the referral_codes table
