/**
 * Admin Utility: Populate Reading Queue with Catalog Books
 * 
 * This script adds all books from the curated catalog (books.json) to the admin user's
 * reading queue with status='finished', since the curator has read all these books.
 * 
 * This ensures the materialized view (user_exclusion_list) automatically excludes
 * all catalog books from recommendations for the admin user.
 * 
 * Run once: node scripts/populate-admin-reading-queue.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Need service key for admin operations
const adminEmail = 'sarah@darkridge.com';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease set these in your .env file or environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📚 Admin Reading Queue Population Script\n');
  
  // Step 1: Load catalog books
  console.log('Step 1: Loading catalog books...');
  const catalogPath = join(__dirname, '..', 'src', 'data', 'books.json');
  let catalog;
  try {
    const catalogData = readFileSync(catalogPath, 'utf-8');
    catalog = JSON.parse(catalogData);
    console.log(`✓ Loaded ${catalog.length} books from catalog\n`);
  } catch (error) {
    console.error('❌ Failed to load catalog:', error.message);
    process.exit(1);
  }
  
  // Step 2: Find admin user
  console.log('Step 2: Finding admin user...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', adminEmail)
    .single();
  
  if (userError || !users) {
    console.error('❌ Failed to find admin user:', userError?.message || 'User not found');
    console.error('   Make sure the admin user exists and email matches:', adminEmail);
    process.exit(1);
  }
  
  console.log(`✓ Found admin user: ${users.email} (${users.id})\n`);
  
  // Step 3: Check existing reading queue
  console.log('Step 3: Checking existing reading queue...');
  const { data: existingQueue, error: queueError } = await supabase
    .from('reading_queue')
    .select('book_title')
    .eq('user_id', users.id);
  
  if (queueError) {
    console.error('❌ Failed to check reading queue:', queueError.message);
    process.exit(1);
  }
  
  const existingTitles = new Set(existingQueue?.map(item => item.book_title.toLowerCase().trim()) || []);
  console.log(`✓ Found ${existingTitles.size} existing books in reading queue\n`);
  
  // Step 4: Filter books that aren't already in queue
  const booksToAdd = catalog.filter(book => 
    !existingTitles.has(book.title.toLowerCase().trim())
  );
  
  console.log(`Step 4: Preparing to add ${booksToAdd.length} new books...\n`);
  
  if (booksToAdd.length === 0) {
    console.log('✓ All catalog books are already in the reading queue. Nothing to do!');
    process.exit(0);
  }
  
  // Step 5: Bulk insert books
  console.log('Step 5: Adding books to reading queue...');
  const booksData = booksToAdd.map(book => ({
    user_id: users.id,
    book_title: book.title,
    book_author: book.author,
    status: 'finished',
    added_at: new Date().toISOString()
  }));
  
  // Insert in batches of 50 to avoid timeouts
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < booksData.length; i += batchSize) {
    const batch = booksData.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(booksData.length / batchSize);
    
    process.stdout.write(`   Batch ${batchNum}/${totalBatches}: Inserting ${batch.length} books... `);
    
    const { data, error } = await supabase
      .from('reading_queue')
      .insert(batch)
      .select();
    
    if (error) {
      console.log('❌ FAILED');
      console.error('   Error:', error.message);
      errorCount += batch.length;
    } else {
      console.log('✓ SUCCESS');
      successCount += data.length;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✓ Successfully added: ${successCount} books`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed to add: ${errorCount} books`);
  }
  console.log(`   📚 Total in catalog: ${catalog.length} books`);
  console.log(`   📖 Already in queue: ${existingTitles.size} books`);
  
  console.log('\n✅ Done! The materialized view will automatically refresh.');
  console.log('   All catalog books are now excluded from recommendations for the admin user.');
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
