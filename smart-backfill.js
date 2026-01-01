// Smart backfill - fail fast, resume safely, includes ISBN
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateDescription(title, author) {
  const prompt = `Generate a brief 2-3 sentence description for "${title}" by ${author || 'Unknown'}. Spoiler-free, focus on themes/setting.`;

  const response = await fetch('https://www.sarahsbooks.com/api/chat', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-key': 'sarah-backfill-2024'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      system: [{ type: 'text', text: 'You are a book curator. Be concise.' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text.slice(0, 100)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || null;
}

async function fetchISBN(title, author) {
  try {
    const q = `${title} ${author}`.replace(/\s+/g, '+');
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1`);
    const data = await res.json();
    if (data.docs?.[0]) {
      const book = data.docs[0];
      return {
        isbn: book.isbn?.[0] || book.isbn_13?.[0] || null,
        isbn10: book.isbn_10?.[0] || null,
        isbn13: book.isbn_13?.[0] || null,
        openLibraryKey: book.key?.split('/').pop() || null,
        firstPublishYear: book.first_publish_year || null,
        coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null
      };
    }
  } catch (e) { /* silent */ }
  return null;
}

async function run() {
  // Get remaining books
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('description.is.null,description.eq.')
    .order('book_title');

  if (error) { console.error('DB error:', error); return; }
  
  console.log(`${books.length} books need descriptions\n`);
  if (books.length === 0) { console.log('All done!'); return; }

  // Test first one
  console.log('Testing first book...');
  try {
    const test = await generateDescription(books[0].book_title, books[0].book_author);
    if (!test) throw new Error('Empty response');
    console.log('✓ API working\n');
  } catch (e) {
    console.error('✗ API failed:', e.message);
    console.log('\nStopping. Fix the issue and re-run.');
    return;
  }

  let updated = 0, isbnFound = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`[${i+1}/${books.length}] ${book.book_title.slice(0,40)}... `);

    try {
      const description = await generateDescription(book.book_title, book.book_author);
      if (!description) { console.log('❌ empty'); failed++; continue; }

      const isbn = await fetchISBN(book.book_title, book.book_author);
      
      const updateData = { description };
      if (isbn?.isbn) {
        updateData.isbn = isbn.isbn;
        updateData.isbn10 = isbn.isbn10;
        updateData.isbn13 = isbn.isbn13;
        updateData.open_library_key = isbn.openLibraryKey;
        updateData.first_publish_year = isbn.firstPublishYear;
        updateData.cover_image_url = isbn.coverUrl;
        isbnFound++;
      }

      const { error: upErr } = await supabase
        .from('reading_queue')
        .update(updateData)
        .eq('id', book.id);

      if (upErr) { console.log('❌ db:', upErr.message); failed++; }
      else { console.log(`✓${isbn?.isbn ? ' +ISBN' : ''}`); updated++; }

    } catch (e) {
      console.log('❌', e.message.slice(0, 50));
      failed++;
      if (e.message.includes('429') || e.message.includes('rate')) {
        console.log('\nRate limited. Waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }

    // 1.5s delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nDone! Updated: ${updated}, ISBNs: ${isbnFound}, Failed: ${failed}`);
}

run().catch(console.error);
