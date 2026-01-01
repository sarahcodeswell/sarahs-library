// Script to check author data in the database
// Run with: node scripts/check-db-authors.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthors() {
  console.log('Checking reading_queue table for author data...\n');
  
  // Get sample of books from reading_queue
  const { data: queueBooks, error: queueError } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author, description, status, user_id')
    .limit(20);
  
  if (queueError) {
    console.error('Error fetching reading_queue:', queueError);
    return;
  }
  
  console.log('=== READING QUEUE SAMPLE ===');
  console.log(`Total fetched: ${queueBooks.length}\n`);
  
  let withAuthor = 0;
  let withoutAuthor = 0;
  let withDescription = 0;
  let withoutDescription = 0;
  
  queueBooks.forEach((book, i) => {
    const hasAuthor = book.book_author && book.book_author.trim().length > 0;
    const hasDesc = book.description && book.description.trim().length > 0;
    
    if (hasAuthor) withAuthor++;
    else withoutAuthor++;
    
    if (hasDesc) withDescription++;
    else withoutDescription++;
    
    console.log(`${i + 1}. "${book.book_title}"`);
    console.log(`   Author: ${hasAuthor ? book.book_author : '(MISSING)'}`);
    console.log(`   Description: ${hasDesc ? book.description.substring(0, 50) + '...' : '(MISSING)'}`);
    console.log(`   Status: ${book.status}`);
    console.log('');
  });
  
  console.log('=== SUMMARY ===');
  console.log(`Books with author: ${withAuthor}`);
  console.log(`Books without author: ${withoutAuthor}`);
  console.log(`Books with description: ${withDescription}`);
  console.log(`Books without description: ${withoutDescription}`);
  
  // Get total counts
  const { count: totalCount } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true });
  
  const { count: missingAuthorCount } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .or('book_author.is.null,book_author.eq.');
  
  const { count: missingDescCount } = await supabase
    .from('reading_queue')
    .select('*', { count: 'exact', head: true })
    .or('description.is.null,description.eq.');
  
  console.log(`\n=== TOTAL COUNTS ===`);
  console.log(`Total books in reading_queue: ${totalCount}`);
  console.log(`Books missing author: ${missingAuthorCount}`);
  console.log(`Books missing description: ${missingDescCount}`);
}

checkAuthors().catch(console.error);
