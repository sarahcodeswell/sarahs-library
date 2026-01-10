#!/usr/bin/env node
/**
 * One-time script to enrich books.json with reputation data from Google Books API
 * 
 * Usage: node scripts/enrich-catalog-books.js
 * 
 * This script:
 * 1. Reads books.json
 * 2. For each book, fetches reputation data from Google Books API
 * 3. Updates the book with reputation and enriched description
 * 4. Writes the updated books.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKS_JSON_PATH = path.join(__dirname, '../src/books.json');
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Rate limiting - Google Books API has limits
const DELAY_MS = 500;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch book data from Google Books API
 */
async function fetchGoogleBooksData(title, author) {
  const query = encodeURIComponent(`${title} ${author}`);
  const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  API error for "${title}": ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.warn(`  No results for "${title}"`);
      return null;
    }
    
    const volumeInfo = data.items[0].volumeInfo;
    return {
      description: volumeInfo.description || null,
      categories: volumeInfo.categories || [],
      averageRating: volumeInfo.averageRating || null,
      ratingsCount: volumeInfo.ratingsCount || null,
      publishedDate: volumeInfo.publishedDate || null,
      pageCount: volumeInfo.pageCount || null,
      maturityRating: volumeInfo.maturityRating || null
    };
  } catch (error) {
    console.error(`  Error fetching "${title}":`, error.message);
    return null;
  }
}

/**
 * Build reputation string from Google Books data
 */
function buildReputation(googleData, existingReputation) {
  if (existingReputation) return existingReputation; // Keep existing
  if (!googleData) return null;
  
  const parts = [];
  
  // Goodreads-style rating
  if (googleData.averageRating && googleData.ratingsCount) {
    parts.push(`${googleData.averageRating}/5 stars (${googleData.ratingsCount.toLocaleString()} ratings)`);
  }
  
  // Categories as genre indicators
  if (googleData.categories && googleData.categories.length > 0) {
    // Don't add categories to reputation - they're already in themes
  }
  
  return parts.length > 0 ? parts.join(' • ') : null;
}

/**
 * Enrich description if current one is too short
 */
function enrichDescription(currentDesc, googleDesc) {
  // If current description is good (>100 chars), keep it
  if (currentDesc && currentDesc.length > 100) {
    return currentDesc;
  }
  
  // If Google description is better, use it (but clean it up)
  if (googleDesc && googleDesc.length > (currentDesc?.length || 0)) {
    // Clean up HTML entities and truncate if too long
    let cleaned = googleDesc
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Truncate to ~300 chars at sentence boundary
    if (cleaned.length > 350) {
      const truncated = cleaned.substring(0, 350);
      const lastSentence = truncated.lastIndexOf('.');
      if (lastSentence > 200) {
        cleaned = truncated.substring(0, lastSentence + 1);
      } else {
        cleaned = truncated + '...';
      }
    }
    
    return cleaned;
  }
  
  return currentDesc;
}

async function main() {
  console.log('📚 Enriching books.json with reputation data...\n');
  
  // Read current books.json
  const booksJson = fs.readFileSync(BOOKS_JSON_PATH, 'utf8');
  const books = JSON.parse(booksJson);
  
  console.log(`Found ${books.length} books to process.\n`);
  
  let enriched = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title} by ${book.author}`);
    
    // Skip if already has reputation
    if (book.reputation) {
      console.log('  ✓ Already has reputation, skipping');
      skipped++;
      continue;
    }
    
    // Fetch from Google Books
    const googleData = await fetchGoogleBooksData(book.title, book.author);
    
    if (googleData) {
      // Build reputation
      const reputation = buildReputation(googleData, book.reputation);
      if (reputation) {
        book.reputation = reputation;
        console.log(`  + Reputation: ${reputation}`);
      }
      
      // Enrich description if needed
      const newDesc = enrichDescription(book.description, googleData.description);
      if (newDesc !== book.description) {
        book.description = newDesc;
        console.log(`  + Description enriched (${newDesc.length} chars)`);
      }
      
      enriched++;
    } else {
      errors++;
    }
    
    // Rate limiting
    await sleep(DELAY_MS);
  }
  
  // Write updated books.json
  const output = JSON.stringify(books, null, 4);
  fs.writeFileSync(BOOKS_JSON_PATH, output, 'utf8');
  
  console.log('\n✅ Done!');
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📝 Updated ${BOOKS_JSON_PATH}`);
}

main().catch(console.error);
