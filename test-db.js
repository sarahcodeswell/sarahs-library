import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBooks() {
  try {
    const { count, error } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`✅ Books in database: ${count}`);
      
      if (count > 0) {
        // Get a sample book
        const { data } = await supabase
          .from('books')
          .select('title, author')
          .limit(3);
        
        console.log('Sample books:');
        data.forEach((book, i) => {
          console.log(`${i + 1}. "${book.title}" by ${book.author || 'Unknown'}`);
        });
      }
    }
  } catch (err) {
    console.error('Database check failed:', err);
  }
}

checkBooks();
