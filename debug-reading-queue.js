// Debug script to check reading queue and collection state
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

async function debugReadingQueue(userId) {
  console.log(`\n🔍 Debugging reading queue for user: ${userId}\n`);
  
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
      
      // Check for books marked as finished
      const finishedBooks = queueData.filter(book => book.status === 'finished');
      console.log(`\n🎯 Books marked as finished: ${finishedBooks.length}`);
      finishedBooks.forEach((book, index) => {
        console.log(`  ${index + 1}. "${book.book_title}" by ${book.book_author}`);
      });
    }
    
    // Check user books collection
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
    
    // Check for potential issues
    console.log('\n🔍 Analysis:');
    
    if (queueData && booksData) {
      const finishedBooks = queueData.filter(book => book.status === 'finished');
      const finishedInCollection = finishedBooks.filter(finished => 
        booksData.some(userBook => 
          userBook.book_title?.toLowerCase() === finished.book_title?.toLowerCase() &&
          userBook.book_author?.toLowerCase() === finished.book_author?.toLowerCase()
        )
      );
      
      console.log(`- Books marked as finished: ${finishedBooks.length}`);
      console.log(`- Books in user collection: ${booksData.length}`);
      console.log(`- Finished books that are in collection: ${finishedInCollection.length}`);
      
      const missingFromCollection = finishedBooks.filter(finished => 
        !booksData.some(userBook => 
          userBook.book_title?.toLowerCase() === finished.book_title?.toLowerCase() &&
          userBook.book_author?.toLowerCase() === finished.book_author?.toLowerCase()
        )
      );
      
      if (missingFromCollection.length > 0) {
        console.log('\n⚠️  Books marked as finished but NOT in user collection:');
        missingFromCollection.forEach((book, index) => {
          console.log(`  ${index + 1}. "${book.book_title}" by ${book.book_author}`);
          console.log(`     Queue ID: ${book.id}, Added: ${book.added_at}`);
        });
        
        console.log('\n🛠️  Suggested fix: These books should be added to user_books table');
      } else {
        console.log('✅ All finished books are properly in user collection');
      }
    }
    
    // Test adding a book to user_books
    console.log('\n🧪 Testing user_books table access...');
    const testBook = {
      user_id: userId,
      book_title: 'Test Book',
      book_author: 'Test Author',
      added_via: 'debug_script'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_books')
      .insert(testBook)
      .select();
    
    if (insertError) {
      console.error('❌ Failed to insert test book:', insertError);
    } else {
      console.log('✅ Successfully inserted test book:', insertData);
      
      // Clean up test book
      await supabase
        .from('user_books')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Cleaned up test book');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node debug-reading-queue.js <user-id>');
  console.log('You can find the user ID in the Supabase auth.users table');
  process.exit(1);
}

debugReadingQueue(userId);
