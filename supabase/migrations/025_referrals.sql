-- Referrals table to track user invitations for k-factor analysis
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(inviter_id, invited_email)
);

-- Index for looking up referrals by inviter
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);

-- Index for looking up by invited email (to link when user signs up)
CREATE INDEX IF NOT EXISTS idx_referrals_invited_email ON referrals(invited_email);

-- RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own sent invitations
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = inviter_id);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');
