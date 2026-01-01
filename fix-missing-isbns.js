// Fix missing ISBNs for 4 books
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const missingISBNs = [
  { title: "Where'd You Go, Bernadette", isbn: "9780316204262" },
  { title: "Silence on the Mountain", isbn: "9780822333685" },
  { title: "How to Be the Love You Seek", isbn: "9780063267749" },
  { title: "The Girl Who Kicked the Hornet's Nest", isbn: "9780062032041" }, // normalized from 978-0-06-203204-4
];

async function run() {
  for (const book of missingISBNs) {
    // Find by title (case-insensitive partial match)
    const { data, error } = await supabase
      .from('reading_queue')
      .select('id, book_title, isbn')
      .ilike('book_title', `%${book.title.slice(0, 20)}%`);
    
    if (error) {
      console.log(`❌ Error finding "${book.title}":`, error.message);
      continue;
    }
    
    if (!data?.length) {
      console.log(`❌ Not found: "${book.title}"`);
      continue;
    }
    
    for (const row of data) {
      const { error: upErr } = await supabase
        .from('reading_queue')
        .update({ 
          isbn: book.isbn,
          isbn13: book.isbn
        })
        .eq('id', row.id);
      
      if (upErr) {
        console.log(`❌ Update failed for "${row.book_title}":`, upErr.message);
      } else {
        console.log(`✓ Updated "${row.book_title}" → ${book.isbn}`);
      }
    }
  }
  
  console.log('\nDone!');
}

run().catch(console.error);
