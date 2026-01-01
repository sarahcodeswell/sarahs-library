// Backfill embeddings and genre metadata for reading_queue
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fetch genres/subjects from Google Books API
async function fetchGenresFromGoogle(title, author, isbn) {
  try {
    // Try ISBN first (most reliable)
    let url;
    if (isbn) {
      url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`;
    } else {
      const q = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
      url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`;
    }
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.items?.length) return null;
    
    const book = data.items[0].volumeInfo;
    return {
      genres: book.categories || [],
      subjects: book.categories || [], // Google uses categories for both
      mainCategory: book.mainCategory || null
    };
  } catch (e) {
    return null;
  }
}

// Generate embedding for a book
async function generateEmbedding(title, author, description) {
  const text = `${title} by ${author || 'Unknown'}. ${description || ''}`.trim();
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

async function run() {
  // Get books without embeddings
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author, description, isbn, embedding')
    .is('embedding', null)
    .order('book_title');

  if (error) {
    console.error('DB error:', error);
    return;
  }
  
  console.log(`${books.length} books need embeddings\n`);
  
  if (books.length === 0) {
    console.log('All books already have embeddings!');
    return;
  }

  // Test first
  console.log('Testing OpenAI API...');
  try {
    const testEmbed = await generateEmbedding('Test Book', 'Test Author', 'A test description');
    console.log(`✓ API working (${testEmbed.length} dimensions)\n`);
  } catch (e) {
    console.error('✗ OpenAI API failed:', e.message);
    return;
  }

  let updated = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`[${i+1}/${books.length}] ${book.book_title.slice(0,35)}... `);

    try {
      // Generate embedding
      const embedding = await generateEmbedding(
        book.book_title, 
        book.book_author, 
        book.description
      );
      
      // Fetch genres
      const metadata = await fetchGenresFromGoogle(
        book.book_title, 
        book.book_author, 
        book.isbn
      );
      
      // Update database
      const updateData = { embedding };
      if (metadata?.genres?.length) {
        updateData.genres = metadata.genres;
        updateData.subjects = metadata.subjects;
      }
      
      const { error: upErr } = await supabase
        .from('reading_queue')
        .update(updateData)
        .eq('id', book.id);

      if (upErr) {
        console.log('❌ db:', upErr.message);
        failed++;
      } else {
        const genreInfo = metadata?.genres?.length ? ` +${metadata.genres.length} genres` : '';
        console.log(`✓${genreInfo}`);
        updated++;
      }
    } catch (e) {
      console.log('❌', e.message);
      failed++;
    }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! Embeddings: ${updated}, Failed: ${failed}`);
}

run().catch(console.error);
