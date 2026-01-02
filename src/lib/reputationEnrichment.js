/**
 * Reputation Enrichment Service
 * Fetches and caches book reputation/accolades data using AI
 */

import { db } from './supabase';

// In-memory cache for reputation data (session-level)
const reputationCache = new Map();

/**
 * Fetch reputation data for a book using Claude AI
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @returns {Promise<string|null>} - Reputation string or null
 */
export async function fetchBookReputation(title, author) {
  const cacheKey = `${title?.toLowerCase()?.trim()}-${author?.toLowerCase()?.trim()}`;
  
  // Check memory cache first
  if (reputationCache.has(cacheKey)) {
    return reputationCache.get(cacheKey);
  }
  
  try {
    const response = await fetch('/api/book-reputation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author })
    });
    
    if (!response.ok) {
      console.error('Failed to fetch reputation:', response.status);
      return null;
    }
    
    const data = await response.json();
    const reputation = data.reputation || null;
    
    // Cache the result
    if (reputation) {
      reputationCache.set(cacheKey, reputation);
    }
    
    return reputation;
  } catch (error) {
    console.error('Error fetching book reputation:', error);
    return null;
  }
}

/**
 * Enrich a reading queue item with reputation data
 * Fetches from AI if not already cached in DB
 * @param {Object} book - Reading queue book object
 * @returns {Promise<string|null>} - Reputation string or null
 */
export async function enrichBookReputation(book) {
  // If already has reputation, return it
  if (book.reputation) {
    return book.reputation;
  }
  
  // Fetch from AI
  const reputation = await fetchBookReputation(book.book_title, book.book_author);
  
  // Save to database for future use
  if (reputation && book.id) {
    try {
      await db.updateReadingQueueItem(book.id, { reputation });
    } catch (error) {
      console.error('Failed to save reputation to DB:', error);
    }
  }
  
  return reputation;
}

/**
 * Batch enrich multiple books with reputation data
 * Useful for one-time migration
 * @param {Array} books - Array of reading queue books
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<number>} - Number of books enriched
 */
export async function batchEnrichReputations(books, onProgress) {
  const booksNeedingEnrichment = books.filter(b => !b.reputation);
  let enrichedCount = 0;
  
  for (let i = 0; i < booksNeedingEnrichment.length; i++) {
    const book = booksNeedingEnrichment[i];
    
    try {
      const reputation = await enrichBookReputation(book);
      if (reputation) {
        enrichedCount++;
      }
    } catch (error) {
      console.error(`Failed to enrich ${book.book_title}:`, error);
    }
    
    if (onProgress) {
      onProgress(i + 1, booksNeedingEnrichment.length);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return enrichedCount;
}

/**
 * Clear the in-memory reputation cache
 */
export function clearReputationCache() {
  reputationCache.clear();
}
