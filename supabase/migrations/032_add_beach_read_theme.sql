-- Add "beach" theme to lighthearted, entertaining books in Sarah's collection
-- Beach Read = Lighthearted, entertaining reads that are pure enjoyment without intellectual challenge

-- Emily Henry books (contemporary romance, lighthearted)
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'Beach Read' AND author = 'Emily Henry')
   OR (title = 'People We Meet on Vacation' AND author = 'Emily Henry');

-- Fredrik Backman books (heartwarming, humorous)
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'A Man Called Ove' AND author = 'Fredrik Backman')
   OR (title = 'My Grandmother Asked Me to Tell You She''s Sorry' AND author = 'Fredrik Backman');

-- Lighthearted bookshop/travel books
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'The Bookshop of Second Chances' AND author = 'Jackie Fraser')
   OR (title = 'The Little Paris Bookshop' AND author = 'Nina George')
   OR (title = 'The Little French Bistro' AND author = 'Nina George');

-- Humorous memoirs
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'A Girl Named Zippy' AND author = 'Haven Kimmel')
   OR (title = 'Born a Crime' AND author = 'Trevor Noah');

-- Entertaining with humor (but still substantive)
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'Lessons in Chemistry' AND author = 'Bonnie Garmus')
   OR (title = 'Interior Chinatown' AND author = 'Charles Yu');

-- Other lighthearted contemporary reads
UPDATE books 
SET themes = array_append(themes, 'beach')
WHERE (title = 'Me Before You' AND author = 'Jojo Moyes')
   OR (title = 'The Time Traveler''s Wife' AND author = 'Audrey Niffenegger');
