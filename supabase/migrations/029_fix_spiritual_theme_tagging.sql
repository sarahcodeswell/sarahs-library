-- Fix Spiritual Seeking theme tagging
-- Remove "spiritual" from books that are more about philosophy, nature, or other themes
-- Keep "spiritual" only for books about mindfulness, wisdom traditions, faith, and meaning-making

-- The Midnight Library - more about identity/existential choices than spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Midnight Library' AND author = 'Matt Haig';

-- Prodigal Summer - nature/ecology, not spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'Prodigal Summer' AND author = 'Barbara Kingsolver';

-- The Unbearable Lightness of Being - philosophy, not spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Unbearable Lightness of Being' AND author = 'Milan Kundera';

-- The Poisonwood Bible - primarily about colonialism and justice
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Poisonwood Bible' AND author = 'Barbara Kingsolver';

-- The Red Tent - biblical retelling, not spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Red Tent' AND author = 'Anita Diamant';

-- The Signature of All Things - botanical exploration, not spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Signature of All Things' AND author = 'Elizabeth Gilbert';

-- The Measure - existential/philosophical, not spiritual seeking
UPDATE books 
SET themes = array_remove(themes, 'spiritual')
WHERE title = 'The Measure' AND author = 'Nikki Erlick';
