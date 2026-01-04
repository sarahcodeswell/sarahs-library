// Basic Search Service
// Handles simple Genre/Author searches with catalog + web results
// Applies Sarah's taste filter to web results

import { supabase } from './supabase';

/**
 * Sarah's taste filter prompt - applied to web results
 */
const TASTE_FILTER_PROMPT = `You are filtering books to match Sarah's curatorial standards:
- Look for: literary quality, character-driven narratives, emotional depth
- Avoid: gratuitous violence, shallow plots
- Bonus: award winners, Indie Next picks, book club favorites

From these books, select the 3 best matches and explain briefly why each fits.

RESPONSE FORMAT (use exactly):
Title: [Book Title]
Author: [Author Name]
Why: [1 sentence why this fits Sarah's standards]

Title: [Book Title]
Author: [Author Name]
Why: [1 sentence why this fits Sarah's standards]

Title: [Book Title]
Author: [Author Name]
Why: [1 sentence why this fits Sarah's standards]`;

/**
 * Search catalog by genre
 */
export async function searchCatalogByGenre(genre, limit = 10) {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase.rpc('find_books_by_genre', {
      genre_filter: genre,
      limit_count: limit
    });
    
    if (error) {
      console.error('[BasicSearch] Genre search error:', error);
      return [];
    }
    
    return (data || []).map(book => ({
      ...book,
      source: 'catalog',
      badge: 'From My Library'
    }));
  } catch (err) {
    console.error('[BasicSearch] Genre search failed:', err);
    return [];
  }
}

/**
 * Search catalog by author
 */
export async function searchCatalogByAuthor(author, limit = 10) {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase.rpc('find_books_by_author', {
      author_filter: author,
      limit_count: limit
    });
    
    if (error) {
      console.error('[BasicSearch] Author search error:', error);
      return [];
    }
    
    return (data || []).map(book => ({
      ...book,
      source: 'catalog',
      badge: 'From My Library'
    }));
  } catch (err) {
    console.error('[BasicSearch] Author search failed:', err);
    return [];
  }
}

/**
 * Search web for books by genre or author
 */
async function searchWebForBooks(searchType, searchValue) {
  try {
    const query = searchType === 'genre'
      ? `best ${searchValue} books 2024 2025 highly rated`
      : `${searchValue} books best novels`;
    
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('[BasicSearch] Web search failed:', err);
    return [];
  }
}

/**
 * Apply Sarah's taste filter to web results using Claude
 */
async function applyTasteFilter(webResults, searchType, searchValue) {
  if (!webResults || webResults.length === 0) return [];
  
  try {
    // Format web results for Claude
    const bookList = webResults
      .filter(r => r.title && r.snippet)
      .slice(0, 10)
      .map(r => `- ${r.title}: ${r.snippet}`)
      .join('\n');
    
    if (!bookList) return [];
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `${TASTE_FILTER_PROMPT}\n\nSearch type: ${searchType}\nSearch value: ${searchValue}\n\nBooks to filter:\n${bookList}`
          }
        ]
      })
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Parse the response
    return parseFilteredBooks(text);
  } catch (err) {
    console.error('[BasicSearch] Taste filter failed:', err);
    return [];
  }
}

/**
 * Parse Claude's filtered book response
 */
function parseFilteredBooks(text) {
  const books = [];
  const lines = text.split('\n');
  let current = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Title:')) {
      if (current && current.title) books.push(current);
      current = { 
        title: trimmed.substring(6).trim(),
        source: 'web',
        badge: 'World Discovery'
      };
    } else if (trimmed.startsWith('Author:') && current) {
      current.author = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('Why:') && current) {
      current.why = trimmed.substring(4).trim();
    }
  }
  
  if (current && current.title) books.push(current);
  return books;
}

/**
 * Main Basic Search function
 * Searches catalog first, then web with taste filter
 */
export async function basicSearch(searchType, searchValue, options = {}) {
  const { includeCatalog = true, includeWeb = true } = options;
  
  console.log(`[BasicSearch] Starting ${searchType} search for: ${searchValue}`);
  
  const results = {
    catalog: [],
    web: [],
    searchType,
    searchValue
  };
  
  // Run catalog and web searches in parallel
  const promises = [];
  
  if (includeCatalog) {
    if (searchType === 'genre') {
      promises.push(
        searchCatalogByGenre(searchValue, 5).then(books => {
          results.catalog = books;
        })
      );
    } else if (searchType === 'author') {
      promises.push(
        searchCatalogByAuthor(searchValue, 5).then(books => {
          results.catalog = books;
        })
      );
    }
  }
  
  if (includeWeb) {
    promises.push(
      searchWebForBooks(searchType, searchValue).then(async webResults => {
        // Apply taste filter to web results
        const filtered = await applyTasteFilter(webResults, searchType, searchValue);
        results.web = filtered;
      })
    );
  }
  
  await Promise.all(promises);
  
  console.log(`[BasicSearch] Found ${results.catalog.length} catalog, ${results.web.length} web results`);
  
  return results;
}

/**
 * Get available genres from catalog
 */
export async function getAvailableGenres() {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('books')
      .select('genre')
      .not('genre', 'is', null);
    
    if (error) return [];
    
    // Get unique genres
    const genres = [...new Set(data.map(b => b.genre).filter(Boolean))];
    return genres.sort();
  } catch (err) {
    return [];
  }
}

/**
 * Get available authors from catalog
 */
export async function getAvailableAuthors() {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('books')
      .select('author')
      .not('author', 'is', null);
    
    if (error) return [];
    
    // Get unique authors
    const authors = [...new Set(data.map(b => b.author).filter(Boolean))];
    return authors.sort();
  } catch (err) {
    return [];
  }
}
