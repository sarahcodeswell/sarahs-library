// Backfill ISBN and cover images from Open Library
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchISBN(title, author) {
  try {
    // Clean title
    const cleanTitle = title
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/:/g, '')
      .trim();
    
    const q = `${cleanTitle} ${author || ''}`.trim();
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(author || '')}&limit=3`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    if (data.docs?.length > 0) {
      // Find best match
      const book = data.docs[0];
      const isbn13 = book.isbn?.find(i => i.length === 13) || book.isbn_13?.[0];
      const isbn10 = book.isbn?.find(i => i.length === 10) || book.isbn_10?.[0];
      
      return {
        isbn: isbn13 || isbn10 || null,
        isbn10: isbn10 || null,
        isbn13: isbn13 || null,
        openLibraryKey: book.key?.replace('/works/', '') || null,
        firstPublishYear: book.first_publish_year || null,
        coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null
      };
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  return null;
}

async function run() {
  // Get all books without ISBN
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('isbn.is.null,isbn.eq.')
    .order('book_title');

  if (error) { console.error('DB error:', error); return; }
  
  console.log(`${books.length} books need ISBNs\n`);
  
  // Test first
  console.log('Testing Open Library API...');
  const test = await fetchISBN('The Great Gatsby', 'F. Scott Fitzgerald');
  if (test?.isbn) {
    console.log(`✓ API working (found ISBN: ${test.isbn})\n`);
  } else {
    console.log('✗ API test failed, but continuing anyway...\n');
  }

  let updated = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`[${i+1}/${books.length}] ${book.book_title.slice(0,35)}... `);

    const isbn = await fetchISBN(book.book_title, book.book_author);
    
    if (isbn?.isbn) {
      const { error: upErr } = await supabase
        .from('reading_queue')
        .update({
          isbn: isbn.isbn,
          isbn10: isbn.isbn10,
          isbn13: isbn.isbn13,
          open_library_key: isbn.openLibraryKey,
          first_publish_year: isbn.firstPublishYear,
          cover_image_url: isbn.coverUrl
        })
        .eq('id', book.id);

      if (upErr) { 
        console.log('❌ db:', upErr.message); 
        failed++; 
      } else { 
        console.log(`✓ ${isbn.isbn}`); 
        updated++; 
      }
    } else {
      console.log('❌ not found');
      failed++;
    }

    // 500ms delay to be nice to Open Library
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! Updated: ${updated}, Not found: ${failed}`);
}

run().catch(console.error);
