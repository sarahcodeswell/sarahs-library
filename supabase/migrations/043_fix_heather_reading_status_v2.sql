-- Fix Heather's "currently reading" books using partial title matching
-- The previous migration may have failed due to exact title matching issues

-- Update currently-reading books (7 total including Just Mercy)
UPDATE reading_queue 
SET status = 'reading', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%heather%' LIMIT 1)
  AND (
    LOWER(book_title) LIKE '%unearthing joy%'
    OR LOWER(book_title) LIKE '%healthy%happy%holy%'
    OR LOWER(book_title) LIKE '%power of the reframe%'
    OR LOWER(book_title) LIKE '%navigating pda%'
    OR LOWER(book_title) LIKE '%magyk%'
    OR LOWER(book_title) LIKE '%motherhood without all the rules%'
    OR LOWER(book_title) LIKE '%just mercy%'
  );

-- Update want-to-read books (use LIKE for partial matching)
-- First, let's update a few key ones to verify the approach works
UPDATE reading_queue 
SET status = 'want_to_read', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%heather%' LIMIT 1)
  AND status = 'already_read'
  AND (
    LOWER(book_title) LIKE '%brothers karamazov%'
    OR LOWER(book_title) LIKE '%one hundred years of solitude%'
    OR LOWER(book_title) LIKE '%catcher in the rye%'
    OR LOWER(book_title) LIKE '%my friends%'
    OR LOWER(book_title) LIKE '%book of alchemy%'
    OR LOWER(book_title) LIKE '%little movements%'
    OR LOWER(book_title) LIKE '%between the world and me%'
    OR LOWER(book_title) LIKE '%made to stick%'
    OR LOWER(book_title) LIKE '%better ways to read the bible%'
    OR LOWER(book_title) LIKE '%salt path%'
    OR LOWER(book_title) LIKE '%bury my heart%'
    OR LOWER(book_title) LIKE '%homeseeking%'
    OR LOWER(book_title) LIKE 'james'
    OR LOWER(book_title) LIKE '%little fires everywhere%'
    OR LOWER(book_title) LIKE '%henna artist%'
    OR LOWER(book_title) LIKE '%book of lost names%'
    OR LOWER(book_title) LIKE '%invisible life of addie larue%'
    OR LOWER(book_title) LIKE '%weyward%'
    OR LOWER(book_title) LIKE '%great alone%'
    OR LOWER(book_title) LIKE '%covenant of water%'
    OR LOWER(book_title) LIKE '%berry pickers%'
    OR LOWER(book_title) LIKE '%frozen river%'
    OR LOWER(book_title) LIKE '%seven husbands of evelyn hugo%'
    OR LOWER(book_title) LIKE '%mad honey%'
    OR LOWER(book_title) LIKE '%into the wild%'
    OR LOWER(book_title) LIKE '%memory rescue%'
    OR LOWER(book_title) LIKE '%distance between us%'
    OR LOWER(book_title) LIKE '%my side of the river%'
    OR LOWER(book_title) LIKE '%demon copperhead%'
    OR LOWER(book_title) LIKE '%picnic in the ruins%'
    OR LOWER(book_title) LIKE '%rabbit hutch%'
    OR LOWER(book_title) LIKE '%cloud cuckoo land%'
    OR LOWER(book_title) LIKE '%one plus one%'
    OR LOWER(book_title) LIKE '%we are displaced%'
    OR LOWER(book_title) LIKE '%orchid and the dandelion%'
    OR LOWER(book_title) LIKE '%practice of the presence of god%'
    OR LOWER(book_title) LIKE '%ruthless elimination of hurry%'
    OR LOWER(book_title) LIKE '%resilient kids%'
    OR LOWER(book_title) LIKE '%angela%ashes%'
    OR LOWER(book_title) LIKE '%fault in our stars%'
    OR LOWER(book_title) LIKE '%salt houses%'
    OR LOWER(book_title) LIKE '%say nothing%'
    OR LOWER(book_title) LIKE '%yellow house%'
    OR LOWER(book_title) LIKE '%american war%'
    OR LOWER(book_title) LIKE '%firebrand and the first lady%'
    OR LOWER(book_title) LIKE '%turn right at machu picchu%'
    OR LOWER(book_title) LIKE '%carmen and grace%'
    OR LOWER(book_title) LIKE '%try softer%'
    OR LOWER(book_title) LIKE '%ministry of ordinary places%'
    OR LOWER(book_title) LIKE '%beasts of a little land%'
    OR LOWER(book_title) LIKE '%what%mine and yours%'
    OR LOWER(book_title) LIKE '%in every mirror she%black%'
    OR LOWER(book_title) LIKE '%warrior of the light%'
    OR LOWER(book_title) LIKE '%boundaries%when to say yes%'
    OR LOWER(book_title) LIKE '%white fragility%'
    OR LOWER(book_title) LIKE '%you are your best thing%'
    OR LOWER(book_title) LIKE '%the prophets%'
  );

-- Add Otis's currently reading book
INSERT INTO reading_queue (user_id, book_title, book_author, status, added_at)
SELECT 
  (SELECT id FROM auth.users WHERE email ILIKE '%otis%' LIMIT 1),
  'Becoming Supernatural: How Common People are Doing the Uncommon',
  'Joe Dispenza',
  'reading',
  NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email ILIKE '%otis%')
ON CONFLICT DO NOTHING;
