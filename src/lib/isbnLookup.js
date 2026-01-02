// ISBN Lookup client helper
// Fetches book metadata from our API endpoint

/**
 * Look up a book by ISBN
 * @param {string} isbn - ISBN-10 or ISBN-13
 * @returns {Promise<Object>} Book data with title, author, cover, etc.
 */
export async function lookupISBN(isbn) {
  const response = await fetch(`/api/isbn-lookup?isbn=${encodeURIComponent(isbn)}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to lookup ISBN');
  }
  
  return data.book;
}

/**
 * Normalize ISBN (remove hyphens, spaces)
 */
export function normalizeISBN(isbn) {
  return isbn.replace(/[-\s]/g, '').trim();
}

/**
 * Validate ISBN format
 */
export function isValidISBN(isbn) {
  const normalized = normalizeISBN(isbn);
  return /^(\d{10}|\d{13})$/.test(normalized);
}

/**
 * Format book data from ISBN lookup for adding to reading queue
 */
export function formatBookForQueue(bookData) {
  return {
    book_title: bookData.title,
    book_author: bookData.author || bookData.authors?.[0] || 'Unknown',
    description: bookData.description,
    isbn: bookData.isbn,
    isbn13: bookData.isbn13,
    isbn10: bookData.isbn10,
    cover_image_url: bookData.coverUrl,
    genres: bookData.genres || bookData.categories || [],
  };
}
