// Check what was successfully updated
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProgress() {
  console.log('Checking progress...\n');
  
  // Get counts
  const { count: total } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true });
  
  const { count: withDesc } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .not('description', 'is', null)
    .not('description', 'eq', '');
  
  const { count: withISBN } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .not('isbn', 'is', null)
    .not('isbn', 'eq', '');
  
  console.log(`Total books: ${total}`);
  console.log(`With descriptions: ${withDesc} (${Math.round(withDesc/total*100)}%)`);
  console.log(`With ISBNs: ${withISBN} (${Math.round(withISBN/total*100)}%)`);
  
  // Get recent updates to see what was processed
  const { data: recent } = await supabase
    .from('reading_queue')
    .select('book_title, book_author, description, isbn, updated_at')
    .not('description', 'is', null)
    .not('description', 'eq', '')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  console.log('\nLast 10 updated books:');
  recent.forEach((book, i) => {
    console.log(`${i+1}. "${book.book_title}"`);
    console.log(`   Author: ${book.book_author}`);
    console.log(`   ISBN: ${book.isbn || 'None'}`);
    console.log(`   Updated: ${book.updated_at}`);
    console.log('');
  });
  
  // Get books still needing descriptions
  const { data: remaining } = await supabase
    .from('reading_queue')
    .select('book_title, book_author')
    .or('description.is.null,description.eq.')
    .limit(10);
  
  console.log(`\nFirst 10 books still needing descriptions:`);
  remaining.forEach((book, i) => {
    console.log(`${i+1}. "${book.book_title}" by ${book.book_author || 'Unknown'}`);
  });
}

checkProgress().catch(console.error);
