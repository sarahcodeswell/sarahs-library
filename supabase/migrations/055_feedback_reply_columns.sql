-- Add columns for admin reply functionality
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_message TEXT;
