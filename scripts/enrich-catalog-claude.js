#!/usr/bin/env node
/**
 * Re-enrich books.json with reputation data using Claude API
 * This replaces the weak Google Books data with proper awards/accolades
 * 
 * Usage: node scripts/enrich-catalog-claude.js
 * 
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BOOKS_JSON_PATH = path.join(__dirname, '../src/books.json');
const DELAY_MS = 300; // Rate limiting

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch reputation data using Claude
 */
async function fetchReputationClaude(title, author) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `For the book "${title}" by ${author || 'unknown author'}, provide a brief reputation summary (1-2 sentences max) mentioning any notable awards, accolades, bestseller status, or critical recognition. Examples:
- "Pulitzer Prize winner, New York Times Bestseller"
- "Indie Next List Pick, Agatha Award Winner for Best First Novel"
- "National Book Award Finalist, over 2 million copies sold"
- "#1 New York Times Bestseller, Goodreads Choice Award Winner"

If the book has no notable awards or recognition, respond with just: "none"

Respond with ONLY the reputation text, no explanation or preamble.`
        }
      ]
    });

    const reputation = message.content[0]?.text?.trim();
    
    if (!reputation || reputation.toLowerCase() === 'none' || reputation.toLowerCase().includes('no notable')) {
      return null;
    }
    
    return reputation;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }
  
  console.log('📚 Re-enriching books.json with Claude API...\n');
  
  // Read current books.json
  const booksJson = fs.readFileSync(BOOKS_JSON_PATH, 'utf8');
  const books = JSON.parse(booksJson);
  
  console.log(`Found ${books.length} books to process.\n`);
  
  let enriched = 0;
  let noReputation = 0;
  let errors = 0;
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title} by ${book.author}`);
    
    // Fetch from Claude (always re-fetch to replace Google Books data)
    const reputation = await fetchReputationClaude(book.title, book.author);
    
    if (reputation) {
      book.reputation = reputation;
      console.log(`  ✅ ${reputation}`);
      enriched++;
    } else {
      // Remove old Google Books reputation if Claude says none
      if (book.reputation) {
        delete book.reputation;
        console.log(`  ⚪ Removed old reputation (no notable awards)`);
      } else {
        console.log(`  ⚪ No notable reputation`);
      }
      noReputation++;
    }
    
    // Rate limiting
    await sleep(DELAY_MS);
  }
  
  // Write updated books.json
  const output = JSON.stringify(books, null, 4);
  fs.writeFileSync(BOOKS_JSON_PATH, output, 'utf8');
  
  console.log('\n✅ Done!');
  console.log(`   With reputation: ${enriched}`);
  console.log(`   No reputation: ${noReputation}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📝 Updated ${BOOKS_JSON_PATH}`);
}

main().catch(console.error);
