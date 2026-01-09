/**
 * World Book Search API
 * 
 * Searches Google Books API for books by title/author.
 * Used by "I know what I want to read" feature.
 * 
 * This is SEPARATE from the recommendations system.
 * Recommendations use: deterministicRouter → recommendationPaths → Claude
 * This uses: Google Books API (same as isbn-lookup.js)
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    // Search Google Books API (same API used in isbn-lookup.js)
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`;
    
    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.error('[book-search] Google Books API error:', response.status);
      return res.status(502).json({ error: 'Failed to search Google Books' });
    }

    const data = await response.json();

    // Transform results to our format
    const allBooks = (data.items || []).map(item => {
      const book = item.volumeInfo;
      const identifiers = book.industryIdentifiers || [];
      const isbn = identifiers.find(id => id.type === 'ISBN_13')?.identifier ||
                   identifiers.find(id => id.type === 'ISBN_10')?.identifier;
      
      // Get cover image (prefer larger)
      let cover_url = null;
      if (book.imageLinks) {
        cover_url = book.imageLinks.thumbnail || book.imageLinks.smallThumbnail;
        if (cover_url) {
          cover_url = cover_url.replace('http:', 'https:');
        }
      }
      
      return {
        title: book.title,
        author: book.authors?.[0] || 'Unknown Author',
        authors: book.authors || [],
        year: book.publishedDate?.substring(0, 4),
        cover_url,
        isbn,
        description: book.description?.substring(0, 200) || null,
        categories: book.categories || [],
        google_books_id: item.id,
        source: 'google_books'
      };
    });
    
    // Deduplicate by title + author (Google Books often returns multiple editions)
    const seen = new Set();
    const books = allBooks.filter(book => {
      const key = `${book.title?.toLowerCase()}:${book.author?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);

    console.log(`[book-search] Query: "${query}" → ${books.length} results`);

    return res.status(200).json({
      success: true,
      query,
      books,
      source: 'google_books'
    });

  } catch (error) {
    console.error('[book-search] Error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
}
