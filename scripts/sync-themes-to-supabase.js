// Sync themes from books.json to Supabase
// Updates the themes array for each book without regenerating embeddings

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load books
const booksPath = path.join(process.cwd(), 'src', 'books.json');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

async function syncThemes() {
  console.log(`\n📚 Syncing themes for ${books.length} books to Supabase...\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const book of books) {
    const { error } = await supabase
      .from('books')
      .update({ themes: book.themes || [] })
      .eq('title', book.title);
    
    if (error) {
      console.error(`❌ Error updating "${book.title}":`, error.message);
      errors++;
    } else {
      updated++;
      if (book.themes?.includes('beach')) {
        console.log(`🏖️ ${book.title}: ${book.themes.join(', ')}`);
      }
    }
  }
  
  console.log(`\n✅ Updated ${updated} books, ${errors} errors`);
  
  // Verify beach books in Supabase
  const { data: beachBooks, error: queryError } = await supabase
    .from('books')
    .select('title, themes')
    .contains('themes', ['beach']);
  
  if (queryError) {
    console.error('Error querying beach books:', queryError);
  } else {
    console.log(`\n🏖️ Beach reads in Supabase (${beachBooks.length}):`);
    beachBooks.forEach(b => console.log(`  - ${b.title}`));
  }
}

syncThemes().catch(console.error);
