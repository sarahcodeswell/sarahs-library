-- Add screenshot_url column to feedback table
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

COMMENT ON COLUMN feedback.screenshot_url IS 'URL to uploaded screenshot in Supabase storage';

-- Create storage bucket for feedback screenshots (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);

-- Storage policies need to be created in Supabase dashboard:
-- 1. Allow anyone to upload: INSERT with check (true)
-- 2. Allow public read: SELECT with check (true)
