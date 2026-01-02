/**
 * Utility functions for cleaning and formatting book descriptions
 */

/**
 * Common patterns that indicate accolades/awards at the start of descriptions
 * These often come from Google Books API and duplicate the Reputation section
 */
const ACCOLADE_PATTERNS = [
  /^(WINNER|FINALIST|NOMINATED|LONGLISTED|SHORTLISTED)\s+(OF|FOR)\s+THE\s+\d{4}\s+/i,
  /^(A\s+)?(NEW YORK TIMES|NYT|WASHINGTON POST|NPR|USA TODAY)\s+(BEST\s*SELLER|BESTSELLER|BEST\s+BOOK)/i,
  /^(WINNER|RECIPIENT)\s+OF\s+(THE\s+)?(PULITZER|BOOKER|NATIONAL BOOK|NOBEL|MAN BOOKER|HUGO|NEBULA)/i,
  /^(PULITZER|BOOKER|NATIONAL BOOK|NOBEL|EDGAR|AGATHA|HUGO|NEBULA)\s+(PRIZE\s+)?(WINNER|WINNING|AWARD)/i,
  /^#\d+\s+(NEW YORK TIMES|NYT|BESTSELLER|BEST\s*SELLER)/i,
  /^(A\s+)?BEST\s+BOOK\s+OF\s+(THE\s+YEAR|20\d{2})/i,
  /^(AN?\s+)?(INSTANT\s+)?(NEW YORK TIMES|NYT|#\d+)?\s*(BEST\s*SELLER|BESTSELLER)/i,
];

/**
 * Patterns for award lists that appear at the start of descriptions
 * e.g., "WINNER OF THE 2021 PULITZER PRIZE FOR FICTION NEW YORK TIMES BESTSELLER..."
 */
const AWARD_LIST_PATTERN = /^([A-Z\s\d#•\-–—,&]+(?:WINNER|BESTSELLER|BEST BOOK|AWARD|PRIZE|PICK|SELECTION|CHOICE|FINALIST|LIST)[A-Z\s\d#•\-–—,&]*)+/i;

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
  
  // First, try to find where the actual description starts
  // Look for common transition phrases that indicate the start of actual content
  const contentStartPatterns = [
    /\b(Based on|In this|This is|Set in|When|After|Before|From|The story|A story|A novel|A tale|In\s+\d{4}|It's\s+\d{4}|It is\s+\d{4})/i,
    /"[A-Z]/,  // Quote starting with capital letter often indicates review quote followed by description
  ];
  
  // Check if description starts with all-caps award text
  const firstSentenceMatch = cleaned.match(/^([^.!?"]+[.!?])\s*/);
  if (firstSentenceMatch) {
    const firstSentence = firstSentenceMatch[1];
    // If first sentence is mostly uppercase and contains award keywords, it's likely accolades
    const upperCaseRatio = (firstSentence.match(/[A-Z]/g) || []).length / firstSentence.length;
    const hasAwardKeywords = /\b(WINNER|BESTSELLER|BEST BOOK|AWARD|PRIZE|PULITZER|BOOKER|NPR|WASHINGTON POST|NEW YORK TIMES|FINALIST|PICK|SELECTION)\b/i.test(firstSentence);
    
    if (upperCaseRatio > 0.5 && hasAwardKeywords) {
      // Remove this sentence and continue checking
      cleaned = cleaned.substring(firstSentenceMatch[0].length).trim();
      
      // Recursively clean in case there are multiple award sentences
      return stripAccoladesFromDescription(cleaned);
    }
  }
  
  // Also check for award lists without periods (just space-separated)
  const awardListMatch = cleaned.match(AWARD_LIST_PATTERN);
  if (awardListMatch && awardListMatch[0].length > 20) {
    // Find where the actual content starts after the award list
    const afterAwards = cleaned.substring(awardListMatch[0].length).trim();
    
    // Look for a transition to actual content
    for (const pattern of contentStartPatterns) {
      const match = afterAwards.match(pattern);
      if (match && match.index !== undefined && match.index < 50) {
        // Found content start, use everything from there
        cleaned = afterAwards.substring(match.index);
        break;
      }
    }
    
    // If we found a significant award list but no clear content start,
    // just remove the award list
    if (cleaned === description.trim() && afterAwards.length > 50) {
      cleaned = afterAwards;
    }
  }
  
  // Clean up any leading quotes that might be review snippets
  // e.g., "A masterpiece" —NYT  Based on...
  const reviewQuotePattern = /^"[^"]{10,200}"\s*[—–-]\s*[A-Za-z\s,]+\s*/;
  const reviewMatch = cleaned.match(reviewQuotePattern);
  if (reviewMatch) {
    cleaned = cleaned.substring(reviewMatch[0].length).trim();
  }
  
  return cleaned || description; // Return original if we stripped everything
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
