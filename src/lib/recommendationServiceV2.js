/**
 * Recommendation Service V2 - Clean implementation using Claude Tool Use
 * 
 * Architecture:
 * 1. Query Extraction (Claude Tool Use) - Parse user intent
 * 2. Entity Validation (Deterministic) - Verify against catalog
 * 3. Routing (Deterministic) - Route to appropriate search
 * 4. Data Retrieval (Deterministic) - Fetch from catalog/web
 * 5. Response Formatting (Claude Tool Use) - Format results
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

import { extractSearchIntent } from './queryExtractor';
import { validateExtraction, getCatalogBooksByAuthor, getCatalogBook } from './entityValidator';
import { formatRecommendations, formatToText } from './responseFormatter';
import { findSimilarBooks, findCatalogBooksByAuthor, getBooksByThemes } from './vectorSearch';
import { findSimilarAuthors } from './worldSearch';
import { db } from './supabase';

/**
 * Main entry point for V2 recommendations
 * 
 * @param {string} userId - User ID for exclusion list
 * @param {string} userMessage - Raw user query
 * @param {Array} readingQueue - User's reading queue
 * @param {Array} themeFilters - Selected theme filters from UI
 * @param {Array} shownBooksInSession - Books already shown this session
 * @returns {Promise<Object>} Recommendation response
 */
export async function getRecommendationsV2(userId, userMessage, readingQueue = [], themeFilters = [], shownBooksInSession = []) {
  const startTime = Date.now();
  
  try {
    // Build exclusion list
    const exclusionTitles = buildExclusionList(readingQueue, shownBooksInSession);
    
    // STEP 1: Extract search intent using Claude Tool Use
    console.log('[V2] Step 1: Extracting search intent...');
    const extraction = await extractSearchIntent(userMessage);
    console.log('[V2] Extraction:', JSON.stringify(extraction, null, 2));
    
    // STEP 2: Validate entities against catalog (deterministic)
    console.log('[V2] Step 2: Validating entities...');
    const validated = validateExtraction(extraction);
    console.log('[V2] Validated:', JSON.stringify(validated, null, 2));
    
    // Handle theme filter override from UI
    if (themeFilters && themeFilters.length > 0) {
      validated.intent = 'theme_search';
      validated.themes = themeFilters;
      console.log('[V2] Theme filter override:', themeFilters);
    }
    
    // STEP 3: Route and retrieve data (deterministic)
    console.log('[V2] Step 3: Routing to', validated.intent);
    const books = await routeAndRetrieve(validated, exclusionTitles);
    console.log('[V2] Retrieved', books.length, 'books');
    
    // STEP 4: Format response using Claude Tool Use
    console.log('[V2] Step 4: Formatting response...');
    const formatted = await formatRecommendations(userMessage, books, validated);
    
    // Convert to text format for UI
    const responseText = formatToText(formatted);
    
    const totalTime = Date.now() - startTime;
    console.log(`[V2] Complete in ${totalTime}ms`);
    
    return {
      success: true,
      response: responseText,
      recommendations: formatted.recommendations,
      metadata: {
        intent: validated.intent,
        extraction_success: extraction.extraction_success,
        validation: validated.validation,
        books_found: books.length,
        latency_ms: totalTime
      }
    };
    
  } catch (error) {
    console.error('[V2] Error:', error);
    return {
      success: false,
      response: "I'm having trouble processing that request. Try browsing one of my curated lists or asking about a specific theme.",
      recommendations: [],
      metadata: { error: error.message }
    };
  }
}

/**
 * Route to appropriate search based on validated intent
 */
async function routeAndRetrieve(validated, exclusionTitles) {
  const { intent, author_mentioned, book_mentioned, search_query, themes } = validated;
  
  let books = [];
  
  switch (intent) {
    case 'similar_author':
      // User wants authors SIMILAR TO the mentioned author
      // Strategy: Search world's library for similar authors (Serper + Google Books)
      if (author_mentioned) {
        console.log('[V2] similar_author: Searching world for authors like', author_mentioned);
        
        // Use world search to find similar authors and their books
        books = await findSimilarAuthors(author_mentioned, 10);
        
        // Filter OUT books by the mentioned author - user wants OTHER authors
        books = books.filter(b => {
          const bookAuthor = (b.author || '').toLowerCase();
          const mentionedAuthor = author_mentioned.toLowerCase();
          return !bookAuthor.includes(mentionedAuthor) && !mentionedAuthor.includes(bookAuthor);
        });
        
        console.log('[V2] similar_author: Found', books.length, 'books from similar authors');
      }
      break;
      
    case 'similar_book':
      // Find the book and get similar ones
      if (book_mentioned) {
        const book = getCatalogBook(book_mentioned);
        if (book) {
          // Use the book's themes/description for vector search
          const searchText = `${book.title} ${book.author} ${book.themes?.join(' ') || ''}`;
          books = await findSimilarBooks(searchText, 10, 0.3);
        }
      }
      break;
      
    case 'theme_search':
    case 'mood_search':
      // Vector search with the cleansed query
      if (themes && themes.length > 0) {
        books = await getBooksByThemes(themes, 10);
      }
      if (books.length < 3) {
        const vectorResults = await findSimilarBooks(search_query, 10, 0.3);
        books = [...books, ...vectorResults];
      }
      break;
      
    case 'new_releases':
      // For now, fall back to vector search
      // TODO: Integrate temporal path with web search
      books = await findSimilarBooks(search_query, 10, 0.3);
      break;
      
    case 'browse':
    default:
      // Return popular/featured books
      books = await getBooksByThemes(['women', 'emotional'], 10);
      break;
  }
  
  // Filter out excluded books (but keep some if user has read most of catalog)
  const beforeFilter = books.length;
  const filteredBooks = filterExcluded(books, exclusionTitles);
  console.log('[V2] Filtered:', beforeFilter, '→', filteredBooks.length, '(excluded', exclusionTitles.size, 'titles)');
  
  // If filtering removed everything, keep original results but mark as "you may have seen"
  if (filteredBooks.length === 0 && beforeFilter > 0) {
    console.log('[V2] All results filtered - showing unfiltered results');
    books = books; // Keep original
  } else {
    books = filteredBooks;
  }
  
  // Deduplicate by title
  books = deduplicateBooks(books);
  
  // Mark source
  books = books.map(b => ({ ...b, source: 'catalog' }));
  
  return books.slice(0, 5);
}

/**
 * Build exclusion list from reading queue and session
 */
function buildExclusionList(readingQueue, shownBooksInSession) {
  const titles = new Set();
  
  // Add books from reading queue
  for (const item of readingQueue || []) {
    if (item.book_title) {
      titles.add(item.book_title.toLowerCase().trim());
    }
  }
  
  // Add books shown this session
  for (const title of shownBooksInSession || []) {
    if (title) {
      titles.add(String(title).toLowerCase().trim());
    }
  }
  
  return titles;
}

/**
 * Filter out excluded books
 */
function filterExcluded(books, exclusionTitles) {
  if (!exclusionTitles || exclusionTitles.size === 0) return books;
  
  return books.filter(book => {
    const title = book.title?.toLowerCase().trim();
    return !exclusionTitles.has(title);
  });
}

/**
 * Deduplicate books by title
 */
function deduplicateBooks(books) {
  const seen = new Set();
  return books.filter(book => {
    const key = book.title?.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parse recommendations from text (for backward compatibility)
 */
export function parseRecommendationsV2(text) {
  // This is a simplified parser - the V2 architecture returns structured data
  // This is only for backward compatibility with existing UI
  const recommendations = [];
  const lines = String(text || '').split('\n');
  
  let currentRec = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Title:')) {
      if (currentRec) recommendations.push(currentRec);
      let title = trimmed.substring(6).trim();
      title = title.replace(/^["']|["']$/g, ''); // Strip quotes
      currentRec = { title };
    } else if (trimmed.startsWith('Author:') && currentRec) {
      currentRec.author = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('Why This Fits:') && currentRec) {
      currentRec.why = trimmed.substring(14).trim();
    } else if (trimmed.startsWith('Why:') && currentRec) {
      currentRec.why = trimmed.substring(4).trim();
    }
  }
  
  if (currentRec) recommendations.push(currentRec);
  
  return recommendations;
}
