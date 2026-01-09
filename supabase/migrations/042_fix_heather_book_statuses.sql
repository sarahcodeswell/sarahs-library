-- Fix Heather's book statuses based on her Goodreads CSV
-- Her books were imported before status-aware parsing was implemented
-- This migration corrects the statuses to match her Goodreads shelves

-- Get Heather's user_id (adjust email pattern if needed)
DO $$
DECLARE
  heather_id UUID;
BEGIN
  SELECT id INTO heather_id FROM auth.users WHERE email ILIKE '%heather%' LIMIT 1;
  
  IF heather_id IS NULL THEN
    RAISE NOTICE 'Heather user not found, skipping migration';
    RETURN;
  END IF;

  -- Update "to-read" books to want_to_read status (57 books)
  UPDATE reading_queue SET status = 'want_to_read', updated_at = NOW()
  WHERE user_id = heather_id AND LOWER(book_title) IN (
    'the brothers karamazov',
    'one hundred years of solitude',
    'the catcher in the rye',
    'my friends',
    'the book of alchemy: a creative practice for an inspired life',
    'little movements',
    'between the world and me',
    'made to stick: why some ideas survive and others die',
    'better ways to read the bible: transforming a weapon of harm into a tool of healing',
    'the salt path',
    'bury my heart at wounded knee: an indian history of the american west',
    'homeseeking',
    'james',
    'little fires everywhere',
    'the henna artist (the jaipur trilogy, #1)',
    'the book of lost names',
    'the invisible life of addie larue',
    'weyward',
    'the great alone',
    'the covenant of water',
    'the berry pickers',
    'the frozen river',
    'the seven husbands of evelyn hugo',
    'mad honey',
    'into the wild',
    'memory rescue: supercharge your brain, reverse memory loss, and remember what matters most',
    'the distance between us',
    'my side of the river',
    'demon copperhead',
    'picnic in the ruins',
    'the rabbit hutch',
    'cloud cuckoo land',
    'one plus one',
    'we are displaced',
    'the orchid and the dandelion',
    'the practice of the presence of god',
    'the ruthless elimination of hurry: how to stay emotionally healthy and spiritually alive in the chaos of the modern world',
    'resilient kids: raising them to embrace life with confidence',
    'angela''s ashes (frank mccourt, #1)',
    'the fault in our stars',
    'salt houses',
    'say nothing: a true story of murder and memory in northern ireland',
    'the yellow house',
    'american war',
    'the firebrand and the first lady: portrait of a friendship: pauli murray, eleanor roosevelt, and the struggle for social justice',
    'turn right at machu picchu: rediscovering the lost city one step at a time',
    'carmen and grace',
    'try softer: a fresh approach to move us out of anxiety, stress, and survival mode--and into a life of connection and joy',
    'the ministry of ordinary places: waking up to god''s goodness around you',
    'beasts of a little land',
    'what''s mine and yours',
    'in every mirror she''s black (in every mirror she''s black, #1)',
    'warrior of the light',
    'boundaries: when to say yes, how to say no to take control of your life',
    'white fragility: why it''s so hard for white people to talk about racism',
    'you are your best thing: vulnerability, shame resilience, and the black experience',
    'the prophets'
  );

  -- Update "currently-reading" books to reading status (6 books from CSV + Just Mercy per user)
  UPDATE reading_queue SET status = 'reading', updated_at = NOW()
  WHERE user_id = heather_id AND LOWER(book_title) IN (
    'unearthing joy: a guide to culturally and historically responsive curriculum and instruction',
    'healthy. happy. holy.: 7 practices toward a holistic life',
    'the power of the reframe: a gentle guide to healing with truth, faith and a new way to see your life',
    'navigating pda in america',
    'magyk (septimus heap, #1)',
    'motherhood without all the rules: trading stressful standards for gospel truths',
    'just mercy'  -- Added per user feedback - Heather is currently reading this
  );

  RAISE NOTICE 'Updated Heather''s book statuses successfully';
END $$;
