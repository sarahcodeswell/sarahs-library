// ISBN Lookup API - fetches book metadata from Google Books API
// Used for "Add by ISBN" feature to ensure complete, accurate data

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const config = {
  runtime: 'edge',
};

/**
 * Normalize ISBN (remove hyphens, spaces)
 */
function normalizeISBN(isbn) {
  return isbn.replace(/[-\s]/g, '').trim();
}

/**
 * Validate ISBN format (10 or 13 digits)
 */
function isValidISBN(isbn) {
  const normalized = normalizeISBN(isbn);
  return /^(\d{10}|\d{13})$/.test(normalized);
}

/**
 * Fetch book data from Google Books API
 */
async function fetchFromGoogleBooks(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return null;
  }
  
  const book = data.items[0].volumeInfo;
  const identifiers = book.industryIdentifiers || [];
  
  // Extract ISBNs
  const isbn13 = identifiers.find(id => id.type === 'ISBN_13')?.identifier;
  const isbn10 = identifiers.find(id => id.type === 'ISBN_10')?.identifier;
  
  // Get best available cover image (prefer larger)
  let coverUrl = null;
  if (book.imageLinks) {
    coverUrl = book.imageLinks.large || 
               book.imageLinks.medium || 
               book.imageLinks.thumbnail || 
               book.imageLinks.smallThumbnail;
    // Ensure HTTPS
    if (coverUrl) {
      coverUrl = coverUrl.replace('http:', 'https:');
      // Remove edge=curl parameter for cleaner images
      coverUrl = coverUrl.replace('&edge=curl', '');
    }
  }
  
  return {
    title: book.title,
    subtitle: book.subtitle || null,
    authors: book.authors || [],
    author: book.authors?.[0] || null,
    description: book.description || null,
    publisher: book.publisher || null,
    publishedDate: book.publishedDate || null,
    pageCount: book.pageCount || null,
    categories: book.categories || [],
    genres: book.categories || [],
    language: book.language || null,
    isbn: isbn13 || isbn10 || isbn,
    isbn13: isbn13 || null,
    isbn10: isbn10 || null,
    coverUrl: coverUrl,
    previewLink: book.previewLink || null,
    infoLink: book.infoLink || null,
  };
}

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get ISBN from query params (GET) or body (POST)
    let isbn;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      isbn = url.searchParams.get('isbn');
    } else {
      const body = await req.json();
      isbn = body.isbn;
    }

    if (!isbn) {
      return new Response(
        JSON.stringify({ error: 'ISBN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedISBN = normalizeISBN(isbn);

    if (!isValidISBN(normalizedISBN)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ISBN format. Must be 10 or 13 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch book data
    const bookData = await fetchFromGoogleBooks(normalizedISBN);

    if (!bookData) {
      return new Response(
        JSON.stringify({ 
          error: 'Book not found',
          message: `No book found with ISBN: ${normalizedISBN}`
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        book: bookData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ISBN lookup error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to lookup ISBN',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
