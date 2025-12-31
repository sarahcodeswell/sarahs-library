// Debug script to check user's collection state
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUserCollection(userId) {
  console.log(`\n🔍 Debugging collection for user: ${userId}\n`);
  
  try {
    // Check reading queue
    console.log('📚 Reading Queue:');
    const { data: queueData, error: queueError } = await supabase
      .from('reading_queue')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    
    if (queueError) {
      console.error('❌ Queue error:', queueError);
    } else {
      console.log(`Found ${queueData.length} books in reading queue:`);
      queueData.forEach((book, index) => {
        console.log(`  ${index + 1}. "${book.book_title}" by ${book.book_author} - Status: ${book.status}`);
      });
    }
    
    // Check user books
    console.log('\n📖 User Books Collection:');
    const { data: booksData, error: booksError } = await supabase
      .from('user_books')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    
    if (booksError) {
      console.error('❌ Books error:', booksError);
    } else {
      console.log(`Found ${booksData.length} books in user collection:`);
      booksData.forEach((book, index) => {
        console.log(`  ${index + 1}. "${book.book_title}" by ${book.book_author} - Added: ${book.added_via}`);
      });
    }
    
    // Check for finished books that should be in collection
    const finishedBooks = queueData?.filter(book => book.status === 'finished') || [];
    console.log(`\n🎯 Analysis:`);
    console.log(`- Books marked as finished: ${finishedBooks.length}`);
    console.log(`- Books in user collection: ${booksData?.length || 0}`);
    
    if (finishedBooks.length > (booksData?.length || 0)) {
      console.log('⚠️  Mismatch detected! Some finished books are not in user collection.');
      
      // Find which finished books are missing from user collection
      const missingBooks = finishedBooks.filter(finished => 
        !booksData?.some(userBook => 
          userBook.book_title?.toLowerCase() === finished.book_title?.toLowerCase() &&
          userBook.book_author?.toLowerCase() === finished.book_author?.toLowerCase()
        )
      );
      
      console.log('Missing books:');
      missingBooks.forEach((book, index) => {
        console.log(`  ${index + 1}. "${book.book_title}" by ${book.book_author}`);
      });
    } else {
      console.log('✅ All finished books appear to be in user collection');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Get user ID from command line or prompt
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node debug-collection.js <user-id>');
  console.log('You can find the user ID in the Supabase auth.users table');
  process.exit(1);
}

debugUserCollection(userId);
