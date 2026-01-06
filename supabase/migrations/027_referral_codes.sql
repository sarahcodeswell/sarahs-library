-- Add referral code to users for shareable links
-- We'll store this in taste_profiles since it's user-specific data

ALTER TABLE taste_profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for fast lookup when someone uses a referral link
CREATE INDEX IF NOT EXISTS idx_taste_profiles_referral_code ON taste_profiles(referral_code);

-- Update referrals table to also track link-based referrals (not just email invites)
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS referral_type TEXT DEFAULT 'email' CHECK (referral_type IN ('email', 'link'));
