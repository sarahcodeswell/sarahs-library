// Catalog Index - Shared book catalog lookup
// Centralized to avoid duplication across components

import bookCatalog from '../books.json';
import { normalizeTitle } from './textUtils';

// Build catalog index for fast lookups (normalized title -> book)
export const CATALOG_TITLE_INDEX = (() => {
  const map = new Map();
  try {
    for (const b of (bookCatalog || [])) {
      const key = normalizeTitle(b?.title);
      if (!key) continue;
      map.set(key, b);
    }
  } catch (e) {
    console.error('Failed to build catalog index:', e);
  }
  return map;
})();

/**
 * Find a book in Sarah's catalog by title (with fuzzy matching)
 * @param {string} title - Book title to search for
 * @returns {Object|null} - Catalog book or null
 */
export function findCatalogBook(title) {
  const t = String(title || '');
  const key = normalizeTitle(t);
  
  // Exact match
  if (key && CATALOG_TITLE_INDEX.has(key)) {
    return CATALOG_TITLE_INDEX.get(key);
  }

  // Fallback for slight title mismatches (partial match)
  const needle = normalizeTitle(t);
  if (!needle) return null;
  
  for (const [k, b] of CATALOG_TITLE_INDEX.entries()) {
    if (k.includes(needle) || needle.includes(k)) return b;
  }
  
  return null;
}

/**
 * Check if a book is in Sarah's catalog
 * @param {string} title - Book title to check
 * @returns {boolean}
 */
export function isInCatalog(title) {
  return findCatalogBook(title) !== null;
}

// Export the raw catalog for components that need it
export { bookCatalog };
