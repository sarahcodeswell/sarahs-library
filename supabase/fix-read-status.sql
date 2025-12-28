-- Fix: Update all books with status='read' to status='finished'
-- The CSV import used 'read' but reading_queue expects 'finished'

-- First, check what statuses exist
SELECT status, COUNT(*) as count
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
GROUP BY status;

-- Update all 'read' status to 'finished'
UPDATE reading_queue
SET status = 'finished'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
  AND status = 'read';

-- Verify the update
SELECT status, COUNT(*) as count
FROM reading_queue
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@darkridge.com')
GROUP BY status;
