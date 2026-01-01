// Fast check of author data in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuthors() {
  console.log('Checking author data...\n');
  
  // Get sample data
  const { data, error } = await supabase
    .from('reading_queue')
    .select('book_title, book_author, description, status')
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Sample of ${data.length} books:\n`);
  
  let missingAuthor = 0;
  let missingDesc = 0;
  let finishedBooks = 0;
  let finishedMissingDesc = 0;
  
  data.forEach((book, i) => {
    const hasAuthor = book.book_author && book.book_author.trim() !== '';
    const hasDesc = book.description && book.description.trim() !== '';
    const isFinished = book.status === 'finished';
    
    if (!hasAuthor) missingAuthor++;
    if (!hasDesc) missingDesc++;
    if (isFinished) {
      finishedBooks++;
      if (!hasDesc) finishedMissingDesc++;
    }
    
    console.log(`${i+1}. "${book.book_title}"`);
    console.log(`   Author: ${hasAuthor ? book.book_author : '❌ MISSING'}`);
    console.log(`   Description: ${hasDesc ? '✅' : '❌ MISSING'}`);
    console.log(`   Status: ${book.status}`);
    console.log('');
  });
  
  // Get totals
  const { count: total } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true });
  
  const { count: noAuthor } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .or('book_author.is.null,book_author.eq.');
  
  const { count: noDesc } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .or('description.is.null,description.eq.');
  
  console.log(`\nTOTALS:`);
  console.log(`Total books: ${total}`);
  console.log(`Missing author: ${noAuthor} (${Math.round(noAuthor/total*100)}%)`);
  console.log(`Missing description: ${noDesc} (${Math.round(noDesc/total*100)}%)`);
  console.log(`Finished books missing desc: Need to check...`);
  
  // Check finished books specifically
  const { count: finished } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'finished');
  
  const { count: finishedNoDesc } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'finished')
    .or('description.is.null,description.eq.');
  
  console.log(`Finished books: ${finished}`);
  console.log(`Finished books missing desc: ${finishedNoDesc} (${Math.round(finishedNoDesc/finished*100)}%)`);
}

checkAuthors().catch(console.error);
