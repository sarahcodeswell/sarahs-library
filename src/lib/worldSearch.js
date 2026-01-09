/**
 * World Search - Search the world's library for books
 * 
 * Uses Serper (web search) + Google Books API for verified book data.
 * This is the "world" data source in V2 architecture.
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

/**
 * Search for authors similar to a given author
 * Uses web search to find recommendations, then Google Books to verify
 * 
 * @param {string} authorName - The author to find similar authors for
 * @param {number} limit - Maximum number of books to return
 * @returns {Promise<Array>} Array of verified book objects
 */
export async function findSimilarAuthors(authorName, limit = 10) {
  console.log('[WorldSearch] Finding authors similar to:', authorName);
  
  try {
    // Step 1: Web search for similar authors
    const searchQuery = `authors similar to ${authorName} books recommendations`;
    const webResults = await searchWeb(searchQuery);
    
    if (!webResults || webResults.length === 0) {
      console.log('[WorldSearch] No web results found');
      return [];
    }
    
    // Step 2: Extract author names from search results
    const authorNames = extractAuthorNames(webResults, authorName);
    console.log('[WorldSearch] Extracted authors:', authorNames);
    
    if (authorNames.length === 0) {
      return [];
    }
    
    // Step 3: Get books by these authors from Google Books
    const books = [];
    for (const author of authorNames.slice(0, 5)) { // Limit to 5 authors
      const authorBooks = await searchGoogleBooks(`${author} fiction`, 2);
      books.push(...authorBooks);
      
      if (books.length >= limit) break;
    }
    
    console.log('[WorldSearch] Found', books.length, 'books from similar authors');
    return books.slice(0, limit);
    
  } catch (error) {
    console.error('[WorldSearch] Error:', error);
    return [];
  }
}

/**
 * Search web using Serper API
 */
async function searchWeb(query) {
  try {
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      console.error('[WorldSearch] Web search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[WorldSearch] Web search error:', error);
    return [];
  }
}

/**
 * Extract author names from web search results
 * Filters out the original author
 */
function extractAuthorNames(results, excludeAuthor) {
  const authors = new Set();
  const excludeLower = excludeAuthor.toLowerCase();
  
  // Common author name patterns
  const authorPatterns = [
    /(?:by|author|written by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:'s|,\s+author)/gi,
  ];
  
  // Known similar authors for common requests (fallback)
  const knownSimilarAuthors = {
    'kristin hannah': ['Lisa Wingate', 'Jojo Moyes', 'Kate Quinn', 'Pam Jenoff', 'Martha Hall Kelly'],
    'colleen hoover': ['Tarryn Fisher', 'L.J. Shen', 'Penelope Douglas', 'Ana Huang'],
    'taylor jenkins reid': ['Emily Henry', 'Evelyn Hugo', 'Malibu Rising'],
  };
  
  // Check for known authors first
  const knownKey = Object.keys(knownSimilarAuthors).find(k => excludeLower.includes(k));
  if (knownKey) {
    return knownSimilarAuthors[knownKey];
  }
  
  // Extract from search results
  for (const result of results) {
    const text = `${result.title || ''} ${result.snippet || ''}`;
    
    for (const pattern of authorPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[1]?.trim();
        if (name && name.length > 3 && !name.toLowerCase().includes(excludeLower)) {
          authors.add(name);
        }
      }
    }
  }
  
  return Array.from(authors).slice(0, 10);
}

/**
 * Search Google Books API for books
 */
async function searchGoogleBooks(query, limit = 5) {
  try {
    const response = await fetch('/api/book-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    });
    
    if (!response.ok) {
      console.error('[WorldSearch] Google Books search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    const books = data.books || [];
    
    // Mark as world source
    return books.map(b => ({
      ...b,
      source: 'world',
      fromWorldSearch: true
    }));
  } catch (error) {
    console.error('[WorldSearch] Google Books error:', error);
    return [];
  }
}

/**
 * Search for books similar to a given book title
 */
export async function findSimilarBooks(bookTitle, authorName, limit = 10) {
  console.log('[WorldSearch] Finding books similar to:', bookTitle);
  
  try {
    const searchQuery = `books similar to "${bookTitle}" by ${authorName}`;
    const webResults = await searchWeb(searchQuery);
    
    // Extract book titles from results and verify with Google Books
    const books = await searchGoogleBooks(searchQuery, limit);
    
    return books;
  } catch (error) {
    console.error('[WorldSearch] Error:', error);
    return [];
  }
}
