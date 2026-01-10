#!/usr/bin/env node
/**
 * Sync Sarah's heart ratings from Supabase to books-enriched.json
 * 
 * Usage: npm run sync-ratings
 * 
 * This pulls ratings from user_books table for Sarah's account
 * and updates the books-enriched.json catalog with a `sarah_rating` field (1-5).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SARAH_EMAIL = 'sarah@darkridge.com';
const CATALOG_PATH = path.join(__dirname, '../src/books-enriched.json');

async function syncRatings() {
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📚 Syncing Sarah\'s ratings to books-enriched.json...\n');

  // 1. Get Sarah's user ID
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('❌ Failed to list users:', userError.message);
    process.exit(1);
  }

  const sarah = users.users.find(u => u.email === SARAH_EMAIL);
  if (!sarah) {
    console.error(`❌ Could not find user with email: ${SARAH_EMAIL}`);
    process.exit(1);
  }

  console.log(`✅ Found Sarah's account: ${sarah.id}`);

  // 2. Get Sarah's rated books from user_books AND reading_queue
  const [userBooksResult, queueResult] = await Promise.all([
    supabase
      .from('user_books')
      .select('book_title, book_author, rating')
      .eq('user_id', sarah.id)
      .not('rating', 'is', null),
    supabase
      .from('reading_queue')
      .select('book_title, book_author, rating')
      .eq('user_id', sarah.id)
      .not('rating', 'is', null)
  ]);

  if (userBooksResult.error) {
    console.error('❌ Failed to fetch user_books ratings:', userBooksResult.error.message);
  }
  if (queueResult.error) {
    console.error('❌ Failed to fetch reading_queue ratings:', queueResult.error.message);
  }

  // Combine ratings from both tables (user_books takes precedence)
  const ratedBooks = [
    ...(userBooksResult.data || []),
    ...(queueResult.data || [])
  ];

  console.log(`📊 Found ${userBooksResult.data?.length || 0} rated books in user_books`);
  console.log(`📊 Found ${queueResult.data?.length || 0} rated books in reading_queue`);
  console.log(`📊 Total: ${ratedBooks.length} rated books\n`);

  // 3. Load current catalog
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`📖 Loaded catalog with ${catalog.length} books`);

  // 4. Create lookup map for ratings (normalized title -> rating)
  const ratingMap = new Map();
  for (const book of ratedBooks) {
    const key = book.book_title?.toLowerCase().trim();
    if (key) {
      ratingMap.set(key, book.rating);
    }
  }

  // 5. Update catalog with ratings
  let updated = 0;
  let notFound = [];

  for (const book of catalog) {
    const key = book.title?.toLowerCase().trim();
    if (ratingMap.has(key)) {
      book.sarah_rating = ratingMap.get(key);
      updated++;
      console.log(`  ⭐ ${book.title}: ${book.sarah_rating}/5`);
    }
  }

  // Check for rated books not in catalog
  for (const [title, rating] of ratingMap) {
    const inCatalog = catalog.some(b => b.title?.toLowerCase().trim() === title);
    if (!inCatalog) {
      notFound.push({ title, rating });
    }
  }

  console.log(`\n✅ Updated ${updated} books with ratings`);

  if (notFound.length > 0) {
    console.log(`\n⚠️  ${notFound.length} rated books not found in catalog:`);
    notFound.forEach(b => console.log(`   - "${b.title}" (${b.rating}/5)`));
  }

  // 6. Write updated catalog
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`\n💾 Saved updated catalog to ${CATALOG_PATH}`);

  // 7. Summary
  const withRatings = catalog.filter(b => b.sarah_rating).length;
  const withoutRatings = catalog.length - withRatings;
  console.log(`\n📈 Catalog summary:`);
  console.log(`   - Books with sarah_rating: ${withRatings}`);
  console.log(`   - Books without rating: ${withoutRatings}`);
}

syncRatings().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
