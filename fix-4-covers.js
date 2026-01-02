// Fetch cover images for the 4 books with ISBNs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const booksToFix = [
  { isbn: "9780316204262", title: "Where'd You Go, Bernadette" },
  { isbn: "9780822333685", title: "Silence on the Mountain" },
  { isbn: "9780063267749", title: "How to Be the Love You Seek" },
  { isbn: "9780062032041", title: "The Girl Who Kicked the Hornet's Nest" },
];

async function fetchFromGoogle(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  
  const data = await res.json();
  if (!data.items?.length) return null;
  
  const book = data.items[0].volumeInfo;
  return {
    cover_image_url: book.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                     book.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
    genres: book.categories || [],
    description: book.description || null
  };
}

async function run() {
  for (const book of booksToFix) {
    console.log(`\nFetching metadata for "${book.title}" (ISBN: ${book.isbn})...`);
    
    const metadata = await fetchFromGoogle(book.isbn);
    
    if (!metadata) {
      console.log(`  ❌ Not found in Google Books`);
      continue;
    }
    
    console.log(`  Cover: ${metadata.cover_image_url ? '✓' : '❌'}`);
    console.log(`  Genres: ${metadata.genres?.join(', ') || 'none'}`);
    
    if (metadata.cover_image_url) {
      const { error } = await supabase
        .from('reading_queue')
        .update({ 
          cover_image_url: metadata.cover_image_url,
          genres: metadata.genres?.length ? metadata.genres : undefined
        })
        .eq('isbn', book.isbn);
      
      if (error) {
        console.log(`  ❌ Update failed:`, error.message);
      } else {
        console.log(`  ✓ Updated in database`);
      }
    }
  }
  
  console.log('\nDone!');
}

run().catch(console.error);
