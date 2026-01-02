// Book Enrichment Service
// Fetches cover images, genres, and ISBN for any book by title/author
// Used to enrich AI recommendations and ensure consistent data across the app

/**
 * Enrich a book with cover image, genres, and ISBN from Google Books API
 * @param {string} title - Book title
 * @param {string} author - Book author (optional but improves accuracy)
 * @returns {Promise<Object>} Enriched book data
 */
export async function enrichBook(title, author = '') {
  try {
    // Build search query
    const query = author 
      ? `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`
      : `intitle:${encodeURIComponent(title)}`;
    
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('[BookEnrichment] Google Books API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('[BookEnrichment] No results for:', title, author);
      return null;
    }
    
    const book = data.items[0].volumeInfo;
    const identifiers = book.industryIdentifiers || [];
    
    // Extract ISBNs
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10')?.identifier;
    
    // Get best available cover image
    let coverUrl = null;
    if (book.imageLinks) {
      coverUrl = book.imageLinks.large || 
                 book.imageLinks.medium || 
                 book.imageLinks.thumbnail || 
                 book.imageLinks.smallThumbnail;
      if (coverUrl) {
        coverUrl = coverUrl.replace('http:', 'https:').replace('&edge=curl', '');
      }
    }
    
    return {
      title: book.title || title,
      author: book.authors?.[0] || author,
      authors: book.authors || [author],
      description: book.description || null,
      coverUrl,
      cover_image_url: coverUrl, // Alias for consistency with DB schema
      genres: book.categories || [],
      isbn: isbn13 || isbn10 || null,
      isbn13,
      isbn10,
      publisher: book.publisher || null,
      publishedDate: book.publishedDate || null,
      pageCount: book.pageCount || null,
    };
  } catch (error) {
    console.error('[BookEnrichment] Error enriching book:', error);
    return null;
  }
}

/**
 * Enrich multiple books in parallel (with rate limiting)
 * @param {Array<{title: string, author: string}>} books - Array of books to enrich
 * @returns {Promise<Array>} Array of enriched books
 */
export async function enrichBooks(books) {
  const results = [];
  
  // Process in batches of 3 to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(book => enrichBook(book.title, book.author))
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < books.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  return results;
}

/**
 * Merge enrichment data with existing book data
 * Preserves existing data, only fills in missing fields
 * @param {Object} book - Original book data
 * @param {Object} enrichment - Enrichment data from Google Books
 * @returns {Object} Merged book data
 */
export function mergeBookData(book, enrichment) {
  if (!enrichment) return book;
  
  return {
    ...book,
    // Only fill in missing fields
    cover_image_url: book.cover_image_url || enrichment.cover_image_url,
    coverUrl: book.coverUrl || enrichment.coverUrl,
    genres: book.genres?.length > 0 ? book.genres : enrichment.genres,
    isbn: book.isbn || enrichment.isbn,
    isbn13: book.isbn13 || enrichment.isbn13,
    isbn10: book.isbn10 || enrichment.isbn10,
    // Use enriched description only if original is very short or missing
    description: (book.description && book.description.length > 50) 
      ? book.description 
      : (enrichment.description || book.description),
  };
}
