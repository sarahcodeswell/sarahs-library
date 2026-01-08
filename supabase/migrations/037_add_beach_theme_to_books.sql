-- Add 'beach' theme to Romance & Contemporary books
-- These are lighthearted, entertaining reads perfect for beach reading

UPDATE books
SET themes = array_append(themes, 'beach')
WHERE title IN (
  'People We Meet on Vacation',
  'Beach Read',
  'Me Before You',
  'A Man Called Ove',
  'My Grandmother Asked Me to Tell You She''s Sorry',
  'The Invisible Life of Addie LaRue',
  'The Time Traveler''s Wife',
  'The Bookshop of Second Chances',
  'The Little Paris Bookshop',
  'The Little French Bistro',
  'The Flamenco Academy',
  'The Hurricane Sisters',
  'Gemini',
  'The 100-Year-Old Man Who Climbed Out the Window and Disappeared',
  'It Starts with Us',
  'A Court of Thorns and Roses'
)
AND NOT ('beach' = ANY(themes));
