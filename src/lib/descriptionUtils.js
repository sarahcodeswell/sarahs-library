/**
 * Utility functions for cleaning and formatting book descriptions
 */

/**
 * Phrases that indicate the START of actual book content
 * These help us find where the real description begins after accolades
 */
const CONTENT_START_MARKERS = [
  // Story openers
  /^(In |On |At |The |A |An |When |After |Before |From |Set in |It's |It is |This is |Based on )/i,
  // Character introductions
  /^[A-Z][a-z]+( [A-Z][a-z]+)? (is |was |has |had |lives |lived |works |worked )/i,
  // Year references in narrative context
  /^(In |It's |It is )\d{4}/i,
  // Quote that starts the description (curly or straight)
  /^[""][A-Z]/,
];

/**
 * Publications and sources commonly listed in accolades
 */
const PUBLICATION_NAMES = [
  'Washington Post', 'New York Times', 'NYT', 'NPR', 'USA Today', 'Entertainment Weekly',
  'Real Simple', 'Marie Claire', 'Lit Hub', 'The Skimm', 'LibraryReads', 'Goodreads',
  'Publishers Weekly', 'Kirkus', 'Booklist', 'Library Journal', 'People', 'Time',
  'Oprah', 'Reese', 'Book Club', 'Barnes & Noble', 'Amazon', 'Apple Books',
  'New York Public Library', 'Chicago Tribune', 'LA Times', 'Boston Globe',
  'Lit Reactor', 'Book Riot', 'Electric Literature', 'The Guardian', 'BBC'
];

/**
 * Strip accolades/awards from the beginning of a description
 * @param {string} description - The book description
 * @returns {string} - Cleaned description without leading accolades
 */
export function stripAccoladesFromDescription(description) {
  if (!description || typeof description !== 'string') {
    return description;
  }
  
  let cleaned = description.trim();
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops
  
  while (iterations < maxIterations) {
    iterations++;
    const before = cleaned;
    
    // 1. Remove leading colons, bullets, dashes (leftover from partial strips)
    cleaned = cleaned.replace(/^[:\s•\-–—·]+/, '').trim();
    
    // 2. Remove "A BEST BOOK OF THE YEAR" style headers with publication lists
    // Pattern: "A BEST BOOK OF THE YEAR: Pub1 • Pub2 • Pub3"
    const bestBookPattern = /^(A\s+)?(BEST\s+BOOK|NAMED\s+(ONE\s+OF\s+)?THE\s+BEST|ONE\s+OF\s+THE\s+BEST|MOST\s+ANTICIPATED)[^"']*?(?=["'"]|[A-Z][a-z]{2,}\s+(is|was|has|had|lives|works)|In\s+\d{4}|When\s|After\s|Before\s|From\s|Set\s|The\s+story|Based\s+on|This\s+(is|novel|book)|$)/i;
    const bestBookMatch = cleaned.match(bestBookPattern);
    if (bestBookMatch && bestBookMatch[0].length > 10) {
      cleaned = cleaned.substring(bestBookMatch[0].length).trim();
      continue;
    }
    
    // 3. Remove "#1 NEW YORK TIMES BESTSELLER" style headers
    const bestsellerPattern = /^(AN?\s+)?(#\d+\s+)?(INSTANT\s+)?(NEW\s+YORK\s+TIMES|NYT|NATIONAL|INTERNATIONAL|USA\s+TODAY)?\s*(BEST\s*SELLER|BESTSELLER|BESTSELLING)[^"']*?(?=["'"]|[A-Z][a-z]{2,}\s+(is|was|has|had)|In\s+\d{4}|When\s|After\s|The\s+story|Based\s+on|This\s+|$)/i;
    const bestsellerMatch = cleaned.match(bestsellerPattern);
    if (bestsellerMatch && bestsellerMatch[0].length > 10) {
      cleaned = cleaned.substring(bestsellerMatch[0].length).trim();
      continue;
    }
    
    // 4. Remove "WINNER OF THE PULITZER PRIZE" style headers
    const winnerPattern = /^(WINNER|FINALIST|LONGLISTED|SHORTLISTED|NOMINATED|RECIPIENT)\s+(OF|FOR)\s+[^"']+?(?=["'"]|[A-Z][a-z]{2,}\s+(is|was|has|had)|In\s+\d{4}|When\s|After\s|The\s+story|Based\s+on|This\s+|$)/i;
    const winnerMatch = cleaned.match(winnerPattern);
    if (winnerMatch && winnerMatch[0].length > 15) {
      cleaned = cleaned.substring(winnerMatch[0].length).trim();
      continue;
    }
    
    // 5. Remove publication lists (": Washington Post • NPR • Entertainment Weekly...")
    // This catches orphaned lists after other patterns were stripped
    const pubListPattern = new RegExp(
      `^[:\\s•\\-–—·]*(${PUBLICATION_NAMES.join('|')})[\\s•\\-–—·]+(${PUBLICATION_NAMES.join('|')})[^"'"]*?(?=["'"]|[A-Z][a-z]{2,}\\s+(is|was|has|had)|In\\s+\\d{4}|When\\s|After\\s|The\\s+story|Based\\s+on|This\\s+|$)`,
      'i'
    );
    const pubListMatch = cleaned.match(pubListPattern);
    if (pubListMatch) {
      cleaned = cleaned.substring(pubListMatch[0].length).trim();
      continue;
    }
    
    // 6. Remove review quotes at the start: "A masterpiece" —NYT
    const reviewQuotePattern = /^[""][^""]{5,200}[""]\s*[—–-]\s*[A-Za-z\s,\.]+\s*/;
    const reviewMatch = cleaned.match(reviewQuotePattern);
    if (reviewMatch) {
      cleaned = cleaned.substring(reviewMatch[0].length).trim();
      continue;
    }
    
    // 7. Check if first "sentence" is all-caps award text
    const firstChunk = cleaned.match(/^([^.!?"]+[.!?])\s*/);
    if (firstChunk) {
      const chunk = firstChunk[1];
      const upperRatio = (chunk.match(/[A-Z]/g) || []).length / chunk.replace(/\s/g, '').length;
      const hasAwardWords = /\b(WINNER|BESTSELLER|BEST\s*BOOK|AWARD|PRIZE|PULITZER|BOOKER|FINALIST|PICK|SELECTION|NAMED|LONGLISTED|SHORTLISTED)\b/i.test(chunk);
      
      if (upperRatio > 0.6 && hasAwardWords) {
        cleaned = cleaned.substring(firstChunk[0].length).trim();
        continue;
      }
    }
    
    // No more changes, we're done
    if (cleaned === before) break;
  }
  
  // Final cleanup: remove any remaining leading punctuation/whitespace
  // Be careful not to strip apostrophes that are part of contractions like "It's"
  cleaned = cleaned.replace(/^[:\s•\-–—·]+/, '').trim();
  // Only strip leading quotes if they're not followed by a letter (i.e., orphaned quotes)
  cleaned = cleaned.replace(/^["'"]+(?![A-Za-z])/, '').trim();
  
  // If we stripped everything or result is too short, return original
  if (!cleaned || cleaned.length < 20) {
    return description.trim();
  }
  
  return cleaned;
}

/**
 * Check if a description likely contains accolades at the start
 * @param {string} description - The book description
 * @returns {boolean} - True if description starts with accolades
 */
export function descriptionStartsWithAccolades(description) {
  if (!description || typeof description !== 'string') {
    return false;
  }
  
  const trimmed = description.trim();
  
  // Check for all-caps start with award keywords
  const firstWords = trimmed.substring(0, 100);
  const upperCaseRatio = (firstWords.match(/[A-Z]/g) || []).length / Math.min(firstWords.length, 100);
  const hasAwardKeywords = /\b(WINNER|BESTSELLER|BEST BOOK|AWARD|PRIZE|PULITZER|BOOKER|NPR|WASHINGTON POST|NEW YORK TIMES|FINALIST)\b/i.test(firstWords);
  
  return upperCaseRatio > 0.4 && hasAwardKeywords;
}
