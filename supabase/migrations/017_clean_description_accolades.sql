-- Migration to clean accolades from existing descriptions in reading_queue and user_recommendations
-- This is a one-time cleanup to remove award/bestseller text from the beginning of descriptions
-- Going forward, the application code will strip accolades before saving

-- Function to strip common accolade patterns from descriptions
-- This mirrors the JavaScript stripAccoladesFromDescription function
CREATE OR REPLACE FUNCTION strip_accolades_from_description(description TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
  prev_cleaned TEXT;
  iterations INT := 0;
BEGIN
  IF description IS NULL OR description = '' THEN
    RETURN description;
  END IF;
  
  cleaned := TRIM(description);
  
  -- Iteratively clean patterns (max 10 iterations to prevent infinite loops)
  WHILE iterations < 10 LOOP
    iterations := iterations + 1;
    prev_cleaned := cleaned;
    
    -- Remove leading colons, bullets, dashes
    cleaned := REGEXP_REPLACE(cleaned, '^[:\s•\-–—·]+', '', 'i');
    cleaned := TRIM(cleaned);
    
    -- Remove "A BEST BOOK OF THE YEAR" style headers
    cleaned := REGEXP_REPLACE(
      cleaned,
      '^(A\s+)?(BEST\s+BOOK|NAMED\s+(ONE\s+OF\s+)?THE\s+BEST|ONE\s+OF\s+THE\s+BEST|MOST\s+ANTICIPATED)[^"''""]*?(?=["''""]|[A-Z][a-z]{2,}\s+(is|was|has|had|lives|works)|In\s+\d{4}|When\s|After\s|Before\s|From\s|Set\s|The\s+story|Based\s+on|This\s+(is|novel|book)|$)',
      '',
      'i'
    );
    cleaned := TRIM(cleaned);
    
    -- Remove "#1 NEW YORK TIMES BESTSELLER" style headers
    cleaned := REGEXP_REPLACE(
      cleaned,
      '^(AN?\s+)?(#\d+\s+)?(INSTANT\s+)?(NEW\s+YORK\s+TIMES|NYT|NATIONAL|INTERNATIONAL|USA\s+TODAY)?\s*(BEST\s*SELLER|BESTSELLER|BESTSELLING)[^"''""]*?(?=["''""]|[A-Z][a-z]{2,}\s+(is|was|has|had)|In\s+\d{4}|When\s|After\s|The\s+story|Based\s+on|This\s+|$)',
      '',
      'i'
    );
    cleaned := TRIM(cleaned);
    
    -- Remove "WINNER OF THE PULITZER PRIZE" style headers
    cleaned := REGEXP_REPLACE(
      cleaned,
      '^(WINNER|FINALIST|LONGLISTED|SHORTLISTED|NOMINATED|RECIPIENT)\s+(OF|FOR)\s+[^"'']+?(?=["''""]|[A-Z][a-z]{2,}\s+(is|was|has|had)|In\s+\d{4}|When\s|After\s|The\s+story|Based\s+on|This\s+|$)',
      '',
      'i'
    );
    cleaned := TRIM(cleaned);
    
    -- Remove publication lists (Washington Post • NPR • Entertainment Weekly...)
    cleaned := REGEXP_REPLACE(
      cleaned,
      '^[:\s•\-–—·]*(Washington Post|New York Times|NYT|NPR|USA Today|Entertainment Weekly|Real Simple|Marie Claire|Lit Hub|The Skimm|LibraryReads|Goodreads|Publishers Weekly|Kirkus|Booklist|Library Journal|People|Time|Oprah|Reese|Book Club|Barnes & Noble|Amazon|Apple Books|New York Public Library|Chicago Tribune|LA Times|Boston Globe|Lit Reactor|Book Riot|Electric Literature|The Guardian|BBC)[\s•\-–—·]+(Washington Post|New York Times|NYT|NPR|USA Today|Entertainment Weekly|Real Simple|Marie Claire|Lit Hub|The Skimm|LibraryReads|Goodreads|Publishers Weekly|Kirkus|Booklist|Library Journal|People|Time|Oprah|Reese|Book Club|Barnes & Noble|Amazon|Apple Books|New York Public Library|Chicago Tribune|LA Times|Boston Globe|Lit Reactor|Book Riot|Electric Literature|The Guardian|BBC)[^"''""]*?(?=["''""]|[A-Z][a-z]{2,}\s+(is|was|has|had)|In\s+\d{4}|When\s|After\s|The\s+story|Based\s+on|This\s+|$)',
      '',
      'i'
    );
    cleaned := TRIM(cleaned);
    
    -- Remove review quotes at the start: "A masterpiece" —NYT
    cleaned := REGEXP_REPLACE(
      cleaned,
      '^[""][^""]{5,200}[""]\s*[—–-]\s*[A-Za-z\s,\.]+\s*',
      '',
      'i'
    );
    cleaned := TRIM(cleaned);
    
    -- Exit if no changes were made
    IF cleaned = prev_cleaned THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Final cleanup: remove any remaining leading punctuation/whitespace
  cleaned := REGEXP_REPLACE(cleaned, '^[:\s•\-–—·"''""]+', '', 'i');
  cleaned := TRIM(cleaned);
  
  -- If we stripped everything or result is too short, return original
  IF cleaned IS NULL OR cleaned = '' OR LENGTH(cleaned) < 20 THEN
    RETURN TRIM(description);
  END IF;
  
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update reading_queue descriptions
UPDATE reading_queue
SET description = strip_accolades_from_description(description)
WHERE description IS NOT NULL
  AND description != ''
  AND (
    description ~* '^(A\s+)?(BEST\s+BOOK|NAMED|ONE\s+OF|MOST\s+ANTICIPATED|WINNER|FINALIST|LONGLISTED|SHORTLISTED|NOMINATED|#\d+|INSTANT|NEW\s+YORK\s+TIMES|NYT|BESTSELLER)'
    OR description ~* '^[:\s•\-–—·]+(Washington|New York|NPR|USA Today)'
  );

-- Update user_recommendations descriptions
UPDATE user_recommendations
SET book_description = strip_accolades_from_description(book_description)
WHERE book_description IS NOT NULL
  AND book_description != ''
  AND (
    book_description ~* '^(A\s+)?(BEST\s+BOOK|NAMED|ONE\s+OF|MOST\s+ANTICIPATED|WINNER|FINALIST|LONGLISTED|SHORTLISTED|NOMINATED|#\d+|INSTANT|NEW\s+YORK\s+TIMES|NYT|BESTSELLER)'
    OR book_description ~* '^[:\s•\-–—·]+(Washington|New York|NPR|USA Today)'
  );

-- Log how many rows were updated (for verification)
DO $$
DECLARE
  rq_count INT;
  ur_count INT;
BEGIN
  SELECT COUNT(*) INTO rq_count FROM reading_queue WHERE description IS NOT NULL;
  SELECT COUNT(*) INTO ur_count FROM user_recommendations WHERE book_description IS NOT NULL;
  RAISE NOTICE 'Cleaned descriptions in reading_queue: checked % rows', rq_count;
  RAISE NOTICE 'Cleaned descriptions in user_recommendations: checked % rows', ur_count;
END $$;
