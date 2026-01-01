// Resume regeneration from where it left off
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate description using deployed API
async function generateDescription(title, author) {
  const prompt = `Generate a brief, engaging 2-3 sentence description for the book "${title}" by ${author || 'Unknown'}. Keep it concise, spoiler-free, and focused on themes/setting.`;

  try {
    const response = await fetch('https://www.sarahsbooks.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        system: [{ type: 'text', text: 'You are a book curator. Generate brief, engaging descriptions.' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.log(`  API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (error) {
    console.log(`  Network error: ${error.message}`);
    return null;
  }
}

// Open Library API for ISBN lookup
async function fetchISBN(title, author) {
  try {
    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    const searchQuery = `${cleanTitle} ${author}`.replace(/\s+/g, '+');
    
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1`);
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const book = data.docs[0];
      return {
        isbn: book.isbn?.[0] || book.isbn_13?.[0] || null,
        isbn10: book.isbn_10?.[0] || null,
        isbn13: book.isbn_13?.[0] || null,
        openLibraryKey: book.key?.split('/').pop() || null,
        firstPublishYear: book.first_publish_year || null
      };
    }
  } catch (error) {
    // Silent fail for ISBN
  }
  return null;
}

async function resumeRegeneration() {
  console.log('Resuming regeneration...\n');
  
  // Get books still needing descriptions
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('description.is.null,description.eq.')
    .order('book_title');
  
  if (error) {
    console.error('Error fetching books:', error);
    return;
  }
  
  console.log(`Found ${books.length} books still needing descriptions\n`);
  
  let updated = 0;
  let isbnFound = 0;
  let failed = 0;
  
  // Process with longer delays to avoid rate limits
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const progress = Math.round((i / books.length) * 100);
    
    console.log(`[${progress}%] ${i+1}/${books.length}: "${book.book_title}"`);
    
    const description = await generateDescription(book.book_title, book.book_author);
    
    if (description) {
      // Try to get ISBN
      const isbnData = await fetchISBN(book.book_title, book.book_author);
      
      const updateData = { description };
      if (isbnData?.isbn) {
        updateData.isbn = isbnData.isbn;
        updateData.isbn10 = isbnData.isbn10;
        updateData.isbn13 = isbnData.isbn13;
        updateData.open_library_key = isbnData.openLibraryKey;
        updateData.first_publish_year = isbnData.firstPublishYear;
        isbnFound++;
      }
      
      const { error: updateError } = await supabase
        .from('reading_queue')
        .update(updateData)
        .eq('id', book.id);
      
      if (!updateError) {
        updated++;
        console.log(`  ✓ Updated${isbnData?.isbn ? ' + ISBN: ' + isbnData.isbn : ''}`);
      } else {
        failed++;
        console.log(`  ❌ DB update failed: ${updateError.message}`);
      }
    } else {
      failed++;
      console.log(`  ❌ No description generated`);
    }
    
    // Wait 2 seconds between requests
    if (i < books.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Processed: ${books.length}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`ISBNs found: ${isbnFound}`);
  console.log(`Failed: ${failed}`);
}

resumeRegeneration().catch(console.error);
