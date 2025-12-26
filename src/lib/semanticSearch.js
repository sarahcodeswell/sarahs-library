// Semantic search for book recommendations
// Uses simple keyword matching and scoring for fast client-side search
// Future: Can be upgraded to embeddings/vector search

/**
 * Calculate similarity score between query and book
 * @param {string} query - User's search query
 * @param {Object} book - Book object from catalog
 * @returns {number} - Similarity score (0-100)
 */
function calculateBookScore(query, book) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  let score = 0;
  
  // Title match (highest weight)
  const titleLower = (book.title || '').toLowerCase();
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 20;
  });
  
  // Author match
  const authorLower = (book.author || '').toLowerCase();
  queryWords.forEach(word => {
    if (authorLower.includes(word)) score += 15;
  });
  
  // Genre match
  const genreLower = (book.genre || '').toLowerCase();
  queryWords.forEach(word => {
    if (genreLower.includes(word)) score += 10;
  });
  
  // Description match
  const descLower = (book.description || '').toLowerCase();
  queryWords.forEach(word => {
    if (descLower.includes(word)) score += 5;
  });
  
  // Themes match
  if (book.themes && Array.isArray(book.themes)) {
    book.themes.forEach(theme => {
      const themeLower = theme.toLowerCase();
      queryWords.forEach(word => {
        if (themeLower.includes(word)) score += 8;
      });
    });
  }
  
  return Math.min(score, 100);
}

/**
 * Search library for books matching query
 * @param {string} query - User's search query
 * @param {Array} catalog - Book catalog
 * @param {Array} readingQueue - User's reading queue (to exclude)
 * @param {number} limit - Max results to return
 * @returns {Array} - Top matching books with scores
 */
export function searchLibrary(query, catalog, readingQueue = [], limit = 10) {
  if (!query || !catalog || !Array.isArray(catalog)) {
    return [];
  }
  
  // Get titles to exclude (already read or queued)
  const excludeTitles = new Set(
    readingQueue.map(item => (item.book_title || '').toLowerCase())
  );
  
  // Score all books
  const scoredBooks = catalog
    .filter(book => !excludeTitles.has((book.title || '').toLowerCase()))
    .map(book => ({
      ...book,
      score: calculateBookScore(query, book)
    }))
    .filter(book => book.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return scoredBooks;
}

/**
 * Build optimized library context for Claude
 * @param {string} query - User's search query
 * @param {Array} catalog - Book catalog
 * @param {Array} readingQueue - User's reading queue
 * @param {number} limit - Max books to include
 * @returns {string} - Formatted library context
 */
export function buildOptimizedLibraryContext(query, catalog, readingQueue = [], limit = 10) {
  const topBooks = searchLibrary(query, catalog, readingQueue, limit);
  
  if (topBooks.length === 0) {
    return 'No strong matches in my library for this specific request.';
  }
  
  return topBooks
    .map(book => {
      const parts = [`- "${book.title}" by ${book.author}`];
      if (book.genre) parts.push(`(${book.genre})`);
      if (book.description) {
        const shortDesc = book.description.slice(0, 100);
        parts.push(`- ${shortDesc}${book.description.length > 100 ? '...' : ''}`);
      }
      return parts.join(' ');
    })
    .join('\n');
}

/**
 * Determine if query should prioritize world search
 * @param {string} query - User's search query
 * @returns {boolean} - True if should prioritize world search
 */
export function shouldPrioritizeWorldSearch(query) {
  const queryLower = query.toLowerCase();
  
  // Keywords that suggest world search
  const worldKeywords = [
    'new release', 'bestseller', 'trending', 'popular', 'latest',
    'recent', '2024', '2025', 'this year', 'award winner',
    'audiobook', 'audio book', 'specific author', 'just published'
  ];
  
  return worldKeywords.some(keyword => queryLower.includes(keyword));
}
