/**
 * Entity Validator - Validates extracted entities against catalog data
 * 
 * This module ensures that authors and books extracted by Claude actually
 * exist in Sarah's catalog. If validation fails, entities are nullified
 * and intents are adjusted accordingly.
 * 
 * NO LLM involvement - purely deterministic code.
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

import bookCatalog from '../books.json';

// Build lookup indexes at module load time
const CATALOG_AUTHORS = [...new Set(
  bookCatalog
    .map(b => b.author?.trim())
    .filter(Boolean)
)];

const CATALOG_TITLES = [...new Set(
  bookCatalog
    .map(b => b.title?.trim())
    .filter(Boolean)
)];

// Normalized versions for fuzzy matching
const NORMALIZED_AUTHORS = CATALOG_AUTHORS.map(a => ({
  original: a,
  normalized: normalizeString(a)
}));

const NORMALIZED_TITLES = CATALOG_TITLES.map(t => ({
  original: t,
  normalized: normalizeString(t)
}));

// Sarah's allowed themes - extracted from catalog
const CATALOG_THEMES = new Set();
bookCatalog.forEach(book => {
  (book.themes || []).forEach(theme => {
    if (theme) CATALOG_THEMES.add(theme.toLowerCase().trim());
  });
});
const ALLOWED_THEMES = Array.from(CATALOG_THEMES);
// Fallback if catalog has no themes
if (ALLOWED_THEMES.length === 0) {
  ALLOWED_THEMES.push('women', 'emotional', 'identity', 'justice', 'spiritual', 
    'family', 'belonging', 'resilience', 'historical', 'contemporary',
    'mystery', 'thriller', 'literary', 'memoir');
}

// Valid intents
const VALID_INTENTS = [
  'similar_author', 'similar_book', 'theme_search', 
  'mood_search', 'new_releases', 'browse'
];

/**
 * Normalize a string for fuzzy matching
 */
function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize whitespace
}

/**
 * Validate an author name against the catalog
 * Returns the canonical author name if found, null otherwise
 */
export function validateAuthor(extractedAuthor) {
  if (!extractedAuthor) return null;
  
  const normalized = normalizeString(extractedAuthor);
  if (!normalized) return null;
  
  // Exact match (case-insensitive)
  const exact = NORMALIZED_AUTHORS.find(a => a.normalized === normalized);
  if (exact) return exact.original;
  
  // Fuzzy match - extracted contains catalog author or vice versa
  const fuzzy = NORMALIZED_AUTHORS.find(a => 
    a.normalized.includes(normalized) || 
    normalized.includes(a.normalized)
  );
  if (fuzzy) return fuzzy.original;
  
  // Not found in catalog
  return null;
}

/**
 * Validate a book title against the catalog
 * Returns the canonical title if found, null otherwise
 */
export function validateBookTitle(extractedTitle) {
  if (!extractedTitle) return null;
  
  const normalized = normalizeString(extractedTitle);
  if (!normalized) return null;
  
  // Exact match (case-insensitive)
  const exact = NORMALIZED_TITLES.find(t => t.normalized === normalized);
  if (exact) return exact.original;
  
  // Fuzzy match - extracted contains catalog title or vice versa
  const fuzzy = NORMALIZED_TITLES.find(t => 
    t.normalized.includes(normalized) || 
    normalized.includes(t.normalized)
  );
  if (fuzzy) return fuzzy.original;
  
  // Not found in catalog
  return null;
}

/**
 * Filter themes to only allowed values
 */
export function validateThemes(extractedThemes) {
  if (!Array.isArray(extractedThemes)) return [];
  
  return extractedThemes
    .map(t => String(t).toLowerCase().trim())
    .filter(t => ALLOWED_THEMES.includes(t));
}

/**
 * Validate and adjust intent based on validated entities
 */
export function validateIntent(intent, validatedAuthor, validatedBook) {
  // Ensure intent is valid
  if (!VALID_INTENTS.includes(intent)) {
    return 'theme_search';
  }
  
  // If similar_author but no valid author, fall back to theme_search
  if (intent === 'similar_author' && !validatedAuthor) {
    return 'theme_search';
  }
  
  // If similar_book but no valid book, fall back to theme_search
  if (intent === 'similar_book' && !validatedBook) {
    return 'theme_search';
  }
  
  return intent;
}

/**
 * Full validation pipeline for extracted query
 * 
 * @param {Object} extraction - Raw extraction from queryExtractor
 * @returns {Object} Validated extraction with verified entities
 */
export function validateExtraction(extraction) {
  if (!extraction) {
    return {
      search_query: '',
      author_mentioned: null,
      book_mentioned: null,
      intent: 'browse',
      themes: [],
      validation: { success: false, reason: 'no_extraction' }
    };
  }

  // Validate each entity
  const validatedAuthor = validateAuthor(extraction.author_mentioned);
  const validatedBook = validateBookTitle(extraction.book_mentioned);
  const validatedThemes = validateThemes(extraction.themes);
  const validatedIntent = validateIntent(
    extraction.intent, 
    validatedAuthor, 
    validatedBook
  );

  // Track what changed during validation
  const validation = {
    success: true,
    author_valid: extraction.author_mentioned ? !!validatedAuthor : null,
    book_valid: extraction.book_mentioned ? !!validatedBook : null,
    intent_changed: validatedIntent !== extraction.intent,
    original_intent: extraction.intent
  };

  return {
    search_query: extraction.search_query || extraction.raw_query || '',
    author_mentioned: validatedAuthor,
    book_mentioned: validatedBook,
    intent: validatedIntent,
    themes: validatedThemes,
    raw_query: extraction.raw_query,
    extraction_success: extraction.extraction_success,
    validation
  };
}

/**
 * Check if an author exists in the catalog (for external use)
 */
export function isAuthorInCatalog(authorName) {
  return validateAuthor(authorName) !== null;
}

/**
 * Check if a book exists in the catalog (for external use)
 */
export function isBookInCatalog(bookTitle) {
  return validateBookTitle(bookTitle) !== null;
}

/**
 * Get the full book object from catalog by title
 */
export function getCatalogBook(bookTitle) {
  const validatedTitle = validateBookTitle(bookTitle);
  if (!validatedTitle) return null;
  
  return bookCatalog.find(b => b.title === validatedTitle) || null;
}

/**
 * Get all books by an author from the catalog
 */
export function getCatalogBooksByAuthor(authorName) {
  const validatedAuthor = validateAuthor(authorName);
  if (!validatedAuthor) return [];
  
  return bookCatalog.filter(b => b.author === validatedAuthor);
}

// Export constants for testing
export { CATALOG_AUTHORS, CATALOG_TITLES, ALLOWED_THEMES, VALID_INTENTS };
