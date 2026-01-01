// Check vector DB status
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking vector DB status...\n');
  
  // Check books table (curated catalog)
  const { data: books, count: booksCount, error: booksErr } = await supabase
    .from('books')
    .select('title, author, themes, embedding', { count: 'exact' })
    .limit(5);
  
  if (booksErr) {
    console.log('Books table error:', booksErr.message);
  } else {
    console.log(`Books table: ${booksCount || books?.length || 0} rows`);
    if (books?.length > 0) {
      console.log('Sample:');
      books.forEach(b => {
        console.log(`  - "${b.title}" by ${b.author}`);
        console.log(`    Themes: ${b.themes?.join(', ') || 'none'}`);
        console.log(`    Has embedding: ${b.embedding ? 'YES' : 'NO'}`);
      });
    }
  }
  
  console.log('\n---\n');
  
  // Check reading_queue for comparison
  const { count: queueCount } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Reading queue: ${queueCount} rows (no embeddings)`);
}

check().catch(console.error);
