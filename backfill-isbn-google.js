// Backfill ISBN using Google Books API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchFromGoogle(title, author) {
  try {
    const q = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    if (data.items?.length > 0) {
      const book = data.items[0].volumeInfo;
      const identifiers = book.industryIdentifiers || [];
      
      const isbn13 = identifiers.find(i => i.type === 'ISBN_13')?.identifier;
      const isbn10 = identifiers.find(i => i.type === 'ISBN_10')?.identifier;
      
      return {
        isbn: isbn13 || isbn10 || null,
        isbn10: isbn10 || null,
        isbn13: isbn13 || null,
        coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        publishedDate: book.publishedDate || null
      };
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  return null;
}

async function run() {
  // Get books without ISBN
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('isbn.is.null,isbn.eq.')
    .order('book_title');

  if (error) { console.error('DB error:', error); return; }
  
  console.log(`${books.length} books need ISBNs\n`);
  
  // Test first
  console.log('Testing Google Books API...');
  const test = await fetchFromGoogle('The Great Gatsby', 'Fitzgerald');
  if (test?.isbn) {
    console.log(`✓ Found: ${test.isbn}\n`);
  } else {
    console.log('✗ Test failed\n');
    return;
  }

  let updated = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`[${i+1}/${books.length}] ${book.book_title.slice(0,35)}... `);

    const result = await fetchFromGoogle(book.book_title, book.book_author);
    
    if (result?.isbn) {
      const { error: upErr } = await supabase
        .from('reading_queue')
        .update({
          isbn: result.isbn,
          isbn10: result.isbn10,
          isbn13: result.isbn13,
          cover_image_url: result.coverUrl,
          first_publish_year: result.publishedDate ? parseInt(result.publishedDate.slice(0,4)) : null
        })
        .eq('id', book.id);

      if (upErr) { 
        console.log('❌ db:', upErr.message); 
        failed++; 
      } else { 
        console.log(`✓ ${result.isbn}`); 
        updated++; 
      }
    } else {
      console.log('❌ not found');
      failed++;
    }

    // 200ms delay
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! Updated: ${updated}, Not found: ${failed}`);
}

run().catch(console.error);
