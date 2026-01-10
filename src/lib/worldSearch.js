/**
 * World Search - Search the world's library for books
 * 
 * Uses Serper (web search) + Google Books API for verified book data.
 * This is the "world" data source in V2 architecture.
 * 
 * Enhanced with Sarah's taste context for better discovery.
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

// Sarah's taste keywords for enriching world searches
const SARAHS_TASTE_KEYWORDS = {
  core: 'emotional depth literary fiction character-driven women resilience',
  themes: {
    women: 'women historical fiction female protagonists untold stories resilience survival',
    beach: 'heartwarming uplifting second chances found family comfort read',
    emotional: 'emotional depth psychological literary fiction grief loss transformation',
    identity: 'identity belonging immigration cultural heritage family secrets coming-of-age',
    spiritual: 'meaning purpose mindfulness wisdom transformation philosophical',
    justice: 'social justice systemic oppression marginalized voices historical injustice'
  }
};

/**
 * Get taste-enriched search query
 * Adds Sarah's taste context to improve world discovery results
 */
function enrichSearchQuery(baseQuery, options = {}) {
  const { theme, addTasteContext = true } = options;
  
  let enrichedQuery = baseQuery;
  
  // Add theme-specific keywords if theme is specified
  if (theme && SARAHS_TASTE_KEYWORDS.themes[theme]) {
    enrichedQuery += ` ${SARAHS_TASTE_KEYWORDS.themes[theme]}`;
  } else if (addTasteContext) {
    // Add core taste keywords for general searches
    enrichedQuery += ` ${SARAHS_TASTE_KEYWORDS.core}`;
  }
  
  return enrichedQuery;
}

/**
 * Search for authors similar to a given author
 * Uses web search to find recommendations, then Google Books to verify
 * Enhanced with Sarah's taste context for better matches
 * 
 * @param {string} authorName - The author to find similar authors for
 * @param {number} limit - Maximum number of books to return
 * @param {Object} options - Search options
 * @param {string} options.theme - Optional theme to filter by
 * @param {boolean} options.addTasteContext - Whether to add Sarah's taste keywords (default: true)
 * @returns {Promise<Array>} Array of verified book objects
 */
export async function findSimilarAuthors(authorName, limit = 10, options = {}) {
  const { theme, addTasteContext = true } = options;
  console.log('[WorldSearch] Finding authors similar to:', authorName, theme ? `(theme: ${theme})` : '');
  
  try {
    // Step 1: Web search for similar authors with taste context
    const baseQuery = `authors similar to ${authorName} books recommendations`;
    const searchQuery = enrichSearchQuery(baseQuery, { theme, addTasteContext });
    console.log('[WorldSearch] Enriched query:', searchQuery);
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
 * Enhanced with Sarah's taste context
 * 
 * @param {string} bookTitle - Book title to find similar books for
 * @param {string} authorName - Author name
 * @param {number} limit - Maximum results
 * @param {Object} options - Search options
 * @param {string} options.theme - Optional theme to filter by
 * @param {boolean} options.addTasteContext - Whether to add Sarah's taste keywords (default: true)
 */
export async function findSimilarBooks(bookTitle, authorName, limit = 10, options = {}) {
  const { theme, addTasteContext = true } = options;
  console.log('[WorldSearch] Finding books similar to:', bookTitle, theme ? `(theme: ${theme})` : '');
  
  try {
    const baseQuery = `books similar to "${bookTitle}" by ${authorName}`;
    const searchQuery = enrichSearchQuery(baseQuery, { theme, addTasteContext });
    console.log('[WorldSearch] Enriched query:', searchQuery);
    
    // Extract book titles from results and verify with Google Books
    const books = await searchGoogleBooks(searchQuery, limit);
    
    return books;
  } catch (error) {
    console.error('[WorldSearch] Error:', error);
    return [];
  }
}

/**
 * Search for books by theme using Sarah's taste context
 * This is for discovering new books that match Sarah's curatorial themes
 * 
 * @param {string} theme - Theme key (women, beach, emotional, identity, spiritual, justice)
 * @param {string} additionalContext - Optional additional search context
 * @param {number} limit - Maximum results
 */
export async function findBooksByTheme(theme, additionalContext = '', limit = 10) {
  console.log('[WorldSearch] Finding books by theme:', theme);
  
  const themeDescriptions = {
    women: 'books about women\'s untold stories historical fiction female protagonists women erased from history survival resilience',
    beach: 'heartwarming uplifting books second chances found family comfort reads feel-good fiction',
    emotional: 'emotionally devastating books literary fiction grief loss psychological depth transformative',
    identity: 'books about identity belonging immigration cultural heritage family secrets diaspora coming-of-age',
    spiritual: 'books about meaning purpose mindfulness wisdom spiritual journey transformation philosophical fiction',
    justice: 'books about social justice systemic oppression marginalized voices historical injustice criminal justice reform'
  };
  
  const themeQuery = themeDescriptions[theme] || theme;
  const searchQuery = `${themeQuery} ${additionalContext} book recommendations`.trim();
  
  console.log('[WorldSearch] Theme search query:', searchQuery);
  
  try {
    const books = await searchGoogleBooks(searchQuery, limit);
    return books.map(b => ({
      ...b,
      matchedTheme: theme,
      source: 'world'
    }));
  } catch (error) {
    console.error('[WorldSearch] Theme search error:', error);
    return [];
  }
}

/**
 * Fetch book description using Serper web search
 * Searches for book synopsis/description from web sources
 * 
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @returns {Promise<Object>} Object with description and source
 */
export async function fetchBookDescription(title, author) {
  console.log('[WorldSearch] Fetching description for:', title, 'by', author);
  
  try {
    // Search for book synopsis/description
    const searchQuery = `"${title}" by ${author} book synopsis description`;
    const results = await searchWeb(searchQuery);
    
    if (!results || results.length === 0) {
      console.log('[WorldSearch] No web results for description');
      return { description: null, source: null };
    }
    
    // Extract description from search results
    // Look for snippets that contain book-related content
    let bestDescription = null;
    let source = null;
    
    for (const result of results) {
      const snippet = result.snippet || '';
      const resultTitle = (result.title || '').toLowerCase();
      
      // Prioritize results from known book sites
      const isBookSite = resultTitle.includes('goodreads') || 
                         resultTitle.includes('amazon') ||
                         resultTitle.includes('barnes') ||
                         resultTitle.includes('book') ||
                         result.link?.includes('goodreads') ||
                         result.link?.includes('amazon');
      
      // Skip very short snippets
      if (snippet.length < 100) continue;
      
      // Skip snippets that are just reviews or ratings
      if (snippet.toLowerCase().includes('rating') && snippet.length < 150) continue;
      
      if (isBookSite && snippet.length > 100) {
        bestDescription = snippet;
        source = result.link;
        break;
      }
      
      // Fallback to any decent snippet
      if (!bestDescription && snippet.length > 150) {
        bestDescription = snippet;
        source = result.link;
      }
    }
    
    if (bestDescription) {
      console.log('[WorldSearch] Found description, length:', bestDescription.length);
      return { description: bestDescription, source };
    }
    
    console.log('[WorldSearch] No suitable description found in results');
    return { description: null, source: null };
    
  } catch (error) {
    console.error('[WorldSearch] Error fetching description:', error);
    return { description: null, source: null };
  }
}
