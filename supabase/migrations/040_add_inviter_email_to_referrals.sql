-- Add inviter_email column to referrals table
-- This allows tracking referrals from beta/curator waitlist users who don't have a user_id yet

-- Add the column (nullable since existing rows won't have it)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_email TEXT;

-- Add index for looking up by inviter email
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_email ON referrals(inviter_email);

-- Update the unique constraint to allow either inviter_id OR inviter_email
-- First drop the old constraint
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_inviter_id_invited_email_key;

-- Add a new constraint that allows null inviter_id if inviter_email is set
-- We use a partial unique index instead of a constraint for more flexibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_inviter_invited 
  ON referrals(COALESCE(inviter_id::text, inviter_email), invited_email);

-- Add referral_type column if not exists (for tracking link vs direct invite)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_type TEXT DEFAULT 'link';
