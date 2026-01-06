/**
 * Migration Script: Convert 'finished' status to 'already_read' for imported books
 * 
 * This script identifies books that were likely imported (Goodreads CSV) vs. 
 * books that were actually finished in-app, and updates their status accordingly.
 * 
 * Criteria for "imported" books:
 * - Status is 'finished'
 * - Multiple books added by same user on same day (bulk import pattern)
 * 
 * Run with: node scripts/migrate-finished-to-already-read.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log('🔄 Starting migration: finished → already_read\n');

  // 1. Fetch all 'finished' books
  const { data: finishedBooks, error: fetchError } = await supabase
    .from('reading_queue')
    .select('id, user_id, book_title, status, added_at')
    .eq('status', 'finished')
    .order('user_id')
    .order('added_at');

  if (fetchError) {
    console.error('Error fetching books:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${finishedBooks.length} books with 'finished' status\n`);

  if (finishedBooks.length === 0) {
    console.log('No books to migrate.');
    return;
  }

  // 2. Group by user and analyze patterns
  const userBooks = new Map();
  finishedBooks.forEach(book => {
    if (!userBooks.has(book.user_id)) {
      userBooks.set(book.user_id, []);
    }
    userBooks.get(book.user_id).push(book);
  });

  console.log(`Books grouped by ${userBooks.size} users:\n`);

  // 3. Identify bulk imports (multiple books added same day)
  const booksToMigrate = [];
  
  for (const [userId, books] of userBooks) {
    // Group by date (YYYY-MM-DD)
    const byDate = new Map();
    books.forEach(book => {
      const date = book.added_at.split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date).push(book);
    });

    // If any date has 3+ books, consider ALL that user's finished books as imports
    // (They used the import feature, so all their "finished" books are likely imports)
    let isImporter = false;
    for (const [date, dateBooks] of byDate) {
      if (dateBooks.length >= 3) {
        isImporter = true;
        console.log(`  User ${userId.substring(0, 8)}... added ${dateBooks.length} books on ${date} (bulk import detected)`);
        break;
      }
    }

    if (isImporter) {
      booksToMigrate.push(...books);
    } else {
      console.log(`  User ${userId.substring(0, 8)}... has ${books.length} finished book(s) - keeping as 'finished' (likely read in-app)`);
    }
  }

  console.log(`\n📚 Books to migrate: ${booksToMigrate.length}`);
  console.log(`📖 Books to keep as finished: ${finishedBooks.length - booksToMigrate.length}\n`);

  if (booksToMigrate.length === 0) {
    console.log('No bulk imports detected. Nothing to migrate.');
    return;
  }

  // 4. Confirm before proceeding
  console.log('Proceeding with migration...\n');

  // 5. Update in batches
  const batchSize = 100;
  let migrated = 0;
  
  for (let i = 0; i < booksToMigrate.length; i += batchSize) {
    const batch = booksToMigrate.slice(i, i + batchSize);
    const ids = batch.map(b => b.id);
    
    const { error: updateError } = await supabase
      .from('reading_queue')
      .update({ status: 'already_read' })
      .in('id', ids);

    if (updateError) {
      console.error(`Error updating batch ${i / batchSize + 1}:`, updateError);
    } else {
      migrated += batch.length;
      console.log(`  ✓ Migrated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} books`);
    }
  }

  console.log(`\n✅ Migration complete! ${migrated} books updated to 'already_read' status.`);
}

migrate().catch(console.error);
