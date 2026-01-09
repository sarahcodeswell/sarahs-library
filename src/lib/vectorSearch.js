// Vector search utilities for semantic book recommendations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Find books similar to a text query using vector search
 * @param {string} query - User's query text
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Minimum similarity threshold
 * @returns {Promise<Array>} Array of similar books with similarity scores
 */
export async function findSimilarBooks(query, limit = 10, threshold = 0.7) {
  try {
    // First, generate embedding for the query
    const embeddingResponse = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const { embedding } = await embeddingResponse.json();

    // Search for similar books
    const { data, error } = await supabase
      .rpc('find_similar_books', {
        query_embedding: embedding,
        limit_count: limit,
        similarity_threshold: threshold
      });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * Get books by specific themes with vector ranking
 * @param {Array<string>} themes - Array of theme names
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of books matching themes
 */
export async function getBooksByThemes(themes, limit = 20) {
  try {
    if (import.meta.env.DEV) console.log('[getBooksByThemes] Searching for themes:', themes);
    
    // Use overlaps (&&) operator - finds books where themes array overlaps with search themes
    // This is more flexible than contains - matches if ANY theme matches
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, description, themes, genre, sarah_assessment')
      .overlaps('themes', themes)
      .limit(limit);

    if (error) {
      console.error('[getBooksByThemes] Error:', error);
      return [];
    }

    if (import.meta.env.DEV) console.log('[getBooksByThemes] Found', data?.length || 0, 'books');
    return data || [];
  } catch (error) {
    console.error('[getBooksByThemes] Failed:', error);
    return [];
  }
}

/**
 * Get Sarah's assessment for a specific book
 * @param {string} title - Book title
 * @returns {Promise<string|null>} Sarah's assessment or null
 */
export async function getSarahAssessment(title) {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('sarah_assessment')
      .eq('title', title)
      .single();

    if (error) {
      console.error('Assessment lookup error:', error);
      return null;
    }

    return data?.sarah_assessment || null;
  } catch (error) {
    console.error('Assessment lookup failed:', error);
    return null;
  }
}

/**
 * Get random books for diversity in recommendations
 * @param {number} count - Number of random books
 * @param {Array<string>} excludeTitles - Titles to exclude
 * @returns {Promise<Array>} Array of random books
 */
export async function getRandomBooks(count = 10, excludeTitles = []) {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .not('title', 'in', `(${excludeTitles.join(',')})`);

    // Add random ordering (PostgreSQL specific)
    const { data, error } = await query.order('RANDOM()').limit(count);

    if (error) {
      console.error('Random books error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Random books failed:', error);
    return [];
  }
}

/**
 * Search across ALL users' reading queues for similar books
 * This enables cross-user learning - books that many users loved become stronger signals
 * @param {string} query - User's query text
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Minimum similarity threshold
 * @returns {Promise<Array>} Array of similar books with aggregated ratings
 */
export async function findSimilarBooksAcrossUsers(query, limit = 10, threshold = 0.6) {
  try {
    // Generate embedding for the query
    const embeddingResponse = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const { embedding } = await embeddingResponse.json();

    // Search reading_queue across all users
    const { data, error } = await supabase.rpc('find_popular_similar_books', {
      query_embedding: embedding,
      limit_count: limit,
      similarity_threshold: threshold
    });

    if (error) {
      console.error('Cross-user vector search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Cross-user vector search failed:', error);
    return [];
  }
}

/**
 * Get highly-rated books across all users (crowd wisdom)
 * @param {number} minRating - Minimum average rating
 * @param {number} minUsers - Minimum number of users who rated
 * @param {string[]} genres - Optional genre filter
 * @returns {Promise<Array>} Array of popular books
 */
export async function getPopularBooks(minRating = 4, minUsers = 2, genres = []) {
  try {
    const { data, error } = await supabase.rpc('get_popular_books', {
      min_rating: minRating,
      min_users: minUsers,
      genre_filter: genres.length > 0 ? genres : null
    });

    if (error) {
      console.error('Popular books error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Popular books failed:', error);
    return [];
  }
}

/**
 * Get genre distribution from user's collection
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Genre counts
 */
export async function getUserGenreProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('reading_queue')
      .select('genres, rating')
      .eq('user_id', userId)
      .not('genres', 'is', null);

    if (error) {
      console.error('Genre profile error:', error);
      return {};
    }

    // Aggregate genres weighted by rating
    const genreCounts = {};
    (data || []).forEach(book => {
      const weight = book.rating || 3; // Default weight of 3 for unrated
      (book.genres || []).forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + weight;
      });
    });

    return genreCounts;
  } catch (error) {
    console.error('Genre profile failed:', error);
    return {};
  }
}

/**
 * Find books by a specific author across all users' collections
 * @param {string} authorName - Author name to search for
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Books by this author with ratings
 */
export async function findBooksByAuthor(authorName, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('reading_queue')
      .select('book_title, book_author, description, genres, rating, isbn, cover_image_url')
      .ilike('book_author', `%${authorName}%`)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Author search error:', error);
      return [];
    }

    // Deduplicate by title and aggregate ratings
    const bookMap = new Map();
    (data || []).forEach(book => {
      const key = book.book_title.toLowerCase();
      if (!bookMap.has(key)) {
        bookMap.set(key, { ...book, ratings: [book.rating].filter(Boolean), userCount: 1 });
      } else {
        const existing = bookMap.get(key);
        if (book.rating) existing.ratings.push(book.rating);
        existing.userCount++;
      }
    });

    return Array.from(bookMap.values()).map(book => ({
      ...book,
      avg_rating: book.ratings.length > 0 
        ? (book.ratings.reduce((a, b) => a + b, 0) / book.ratings.length).toFixed(1)
        : null,
      user_count: book.userCount
    }));
  } catch (error) {
    console.error('Author search failed:', error);
    return [];
  }
}

/**
 * Find books by genre across all users' collections
 * @param {string} genre - Genre to search for
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Books in this genre with ratings
 */
export async function findBooksByGenre(genre, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('reading_queue')
      .select('book_title, book_author, description, genres, rating, isbn, cover_image_url')
      .contains('genres', [genre])
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit * 2); // Get more to allow for deduplication

    if (error) {
      // Try partial match if exact match fails
      const { data: partialData, error: partialError } = await supabase
        .from('reading_queue')
        .select('book_title, book_author, description, genres, rating, isbn, cover_image_url')
        .not('genres', 'is', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      if (partialError) {
        console.error('Genre search error:', partialError);
        return [];
      }

      // Filter for partial genre match
      const filtered = (partialData || []).filter(book => 
        book.genres?.some(g => g.toLowerCase().includes(genre.toLowerCase()))
      );
      return deduplicateBooks(filtered).slice(0, limit);
    }

    return deduplicateBooks(data || []).slice(0, limit);
  } catch (error) {
    console.error('Genre search failed:', error);
    return [];
  }
}

// Helper to deduplicate books by title
function deduplicateBooks(books) {
  const bookMap = new Map();
  books.forEach(book => {
    const key = book.book_title.toLowerCase();
    if (!bookMap.has(key)) {
      bookMap.set(key, { ...book, ratings: [book.rating].filter(Boolean), userCount: 1 });
    } else {
      const existing = bookMap.get(key);
      if (book.rating) existing.ratings.push(book.rating);
      existing.userCount++;
    }
  });

  return Array.from(bookMap.values()).map(book => ({
    ...book,
    avg_rating: book.ratings.length > 0 
      ? (book.ratings.reduce((a, b) => a + b, 0) / book.ratings.length).toFixed(1)
      : null,
    user_count: book.userCount
  }));
}

/**
 * Find books by genre from Sarah's curated catalog (books table)
 * @param {string} genre - Genre to search for (e.g., "Literary Fiction", "Memoir")
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Books in this genre from the catalog
 */
export async function findCatalogBooksByGenre(genre, limit = 20) {
  try {
    const { data, error } = await supabase.rpc('find_books_by_genre', {
      genre_filter: genre,
      limit_count: limit
    });

    if (error) {
      console.error('Catalog genre search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Catalog genre search failed:', error);
    return [];
  }
}

/**
 * Find books by author from Sarah's curated catalog (books table)
 * @param {string} authorName - Author name to search for
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Books by this author from the catalog
 */
export async function findCatalogBooksByAuthor(authorName, limit = 20) {
  try {
    const { data, error } = await supabase.rpc('find_books_by_author', {
      author_filter: authorName,
      limit_count: limit
    });

    if (error) {
      console.error('Catalog author search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Catalog author search failed:', error);
    return [];
  }
}

/**
 * Find books by curator theme from Sarah's curated catalog (books table)
 * Curator themes: women, beach, emotional, identity, justice, spiritual
 * @param {string[]} themes - Array of theme names
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Books matching these themes from the catalog
 */
export async function findCatalogBooksByTheme(themes, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, description, themes, genre, sarah_assessment')
      .contains('themes', themes)
      .limit(limit);

    if (error) {
      console.error('Catalog theme search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Catalog theme search failed:', error);
    return [];
  }
}

/**
 * Search catalog by title or author (simple text search)
 * Used for "I know what I want to read" feature
 * @param {string} query - Search query (title or author)
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Matching books from catalog
 */
export async function searchCatalogByText(query, limit = 10) {
  if (!query || query.length < 2) return [];
  
  try {
    // Use ilike for case-insensitive partial matching
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, description, genre, themes, sarah_assessment')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[searchCatalogByText] Error:', error);
      return [];
    }

    console.log('[searchCatalogByText] Query:', query, 'Results:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('[searchCatalogByText] Failed:', error);
    return [];
  }
}

/**
 * Get loved authors from a user's collection (authors of 4-5 star books)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Authors with their book counts and avg ratings
 */
export async function getLovedAuthors(userId) {
  try {
    const { data, error } = await supabase
      .from('reading_queue')
      .select('book_author, rating')
      .eq('user_id', userId)
      .gte('rating', 4);

    if (error) {
      console.error('Loved authors error:', error);
      return [];
    }

    // Aggregate by author
    const authorStats = {};
    (data || []).forEach(book => {
      const author = book.book_author;
      if (!author) return;
      if (!authorStats[author]) {
        authorStats[author] = { author, ratings: [], bookCount: 0 };
      }
      authorStats[author].ratings.push(book.rating);
      authorStats[author].bookCount++;
    });

    return Object.values(authorStats)
      .map(a => ({
        author: a.author,
        book_count: a.bookCount,
        avg_rating: (a.ratings.reduce((x, y) => x + y, 0) / a.ratings.length).toFixed(1)
      }))
      .sort((a, b) => b.book_count - a.book_count || b.avg_rating - a.avg_rating);
  } catch (error) {
    console.error('Loved authors failed:', error);
    return [];
  }
}

/**
 * Quick catalog probe for routing decisions
 * Returns similarity metrics to determine if catalog can serve the query
 * 
 * @param {string} query - User's query text
 * @param {number} limit - Maximum books to probe (default 5)
 * @returns {Promise<Object>} Probe results with confidence metrics
 */
export async function quickCatalogProbe(query, limit = 5) {
  const startTime = Date.now();
  
  const result = {
    success: false,
    books: [],
    metrics: {
      maxSimilarity: 0,
      avgSimilarity: 0,
      matchCount: 0,
      probeTimeMs: 0
    },
    confidence: 'none', // none, low, medium, high
    recommendedPath: 'WORLD' // CATALOG, HYBRID, WORLD
  };
  
  try {
    // Generate embedding for the query
    const embeddingResponse = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      console.warn('[CatalogProbe] Failed to generate embedding');
      result.probeTimeMs = Date.now() - startTime;
      return result;
    }

    const { embedding } = await embeddingResponse.json();

    // Search catalog with low threshold to see what's available
    const { data, error } = await supabase
      .rpc('find_similar_books', {
        query_embedding: embedding,
        limit_count: limit,
        similarity_threshold: 0.3 // Low threshold to see range of matches
      });

    if (error) {
      console.error('[CatalogProbe] Vector search error:', error);
      result.metrics.probeTimeMs = Date.now() - startTime;
      return result;
    }

    const books = data || [];
    result.books = books;
    result.success = true;
    
    // Compute metrics
    if (books.length > 0) {
      const similarities = books.map(b => b.similarity || 0);
      result.metrics.maxSimilarity = Math.max(...similarities);
      result.metrics.avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      result.metrics.matchCount = books.filter(b => (b.similarity || 0) > 0.35).length;
    }
    
    // Determine confidence and recommended path based on thresholds
    // NOTE: These thresholds are for vector similarity of text queries to book embeddings
    // Text query → book similarity is typically 0.35-0.50
    // Book → book similarity is typically 0.50-0.70
    const { maxSimilarity, matchCount } = result.metrics;
    
    if (maxSimilarity >= 0.50 && matchCount >= 3) {
      result.confidence = 'high';
      result.recommendedPath = 'CATALOG';
    } else if (maxSimilarity >= 0.40 && matchCount >= 2) {
      result.confidence = 'medium';
      result.recommendedPath = 'HYBRID';
    } else if (maxSimilarity >= 0.35 && matchCount >= 1) {
      result.confidence = 'low';
      result.recommendedPath = 'HYBRID';
    } else {
      result.confidence = 'none';
      result.recommendedPath = 'WORLD';
    }
    
    result.metrics.probeTimeMs = Date.now() - startTime;
    
    if (import.meta.env.DEV) console.log(`[CatalogProbe] ${query.substring(0, 30)}... → ${result.recommendedPath} (max: ${result.metrics.maxSimilarity.toFixed(2)}, count: ${result.metrics.matchCount}, ${result.metrics.probeTimeMs}ms)`);
    
    return result;
    
  } catch (error) {
    console.error('[CatalogProbe] Failed:', error);
    result.metrics.probeTimeMs = Date.now() - startTime;
    return result;
  }
}
