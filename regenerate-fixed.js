// Fixed version - direct API calls without descriptionService
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Direct Claude API call
async function generateDescriptions(books) {
  const bookList = books.map((book, i) => 
    `${i + 1}. "${book.title}" by ${book.author || 'Unknown'}`
  ).join('\n');

  const systemPrompt = `You are a book curator. Generate brief, engaging descriptions (2-3 sentences max) for these books.

Keep descriptions concise, spoiler-free, and focused on themes/setting.
If you don't know a book, write a brief generic description based on title and author.

RESPONSE FORMAT:
[BOOK 1]
Description: [Your description here]

[BOOK 2]
Description: [Your description here]

etc.`;

  const userMessage = `Please generate brief descriptions for these books:\n\n${bookList}`;

  try {
    const response = await fetch('https://www.sarahsbooks.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        system: [{ type: 'text', text: systemPrompt }],
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Parse response
    const results = {};
    const sections = text.split(/\[BOOK\s*\d+\]/i).filter(Boolean);
    
    sections.forEach((section, index) => {
      if (index >= books.length) return;
      
      const book = books[index];
      const descMatch = section.match(/Description:\s*([^\n]+)/i);
      
      if (descMatch && descMatch[1]) {
        const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
        results[key] = descMatch[1].trim();
      }
    });
    
    return results;
  } catch (error) {
    console.error('API call failed:', error.message);
    return {};
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

async function regenerateAll() {
  console.log('Starting regeneration...\n');
  
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('description.is.null,description.eq.')
    .limit(50); // Start with 50 for testing
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Processing ${books.length} books\n`);
  
  const batchSize = 5; // Smaller batches
  let updated = 0;
  let isbnFound = 0;
  
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    console.log(`\nBatch ${Math.floor(i/batchSize)+1}:`, batch.map(b => b.book_title).join(', '));
    
    const descriptions = await generateDescriptions(batch);
    
    for (const book of batch) {
      const key = `${book.book_title.toLowerCase()}|${(book.book_author || '').toLowerCase()}`;
      const description = descriptions[key];
      
      if (description) {
        const isbnData = await fetchISBN(book.book_title, book.book_author);
        
        const updateData = { description };
        if (isbnData?.isbn) {
          updateData.isbn = isbnData.isbn;
          updateData.isbn10 = isbnData.isbn10;
          updateData.isbn13 = isbnData.isbn13;
          isbnFound++;
        }
        
        const { error: updateError } = await supabase
          .from('reading_queue')
          .update(updateData)
          .eq('id', book.id);
        
        if (!updateError) {
          updated++;
          console.log(`  ✓ ${book.book_title} ${isbnData?.isbn ? '(+ISBN)' : ''}`);
        } else {
          console.log(`  ❌ Failed: ${updateError.message}`);
        }
      } else {
        console.log(`  ❌ No description for ${book.book_title}`);
      }
    }
    
    if (i + batchSize < books.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, ISBNs: ${isbnFound}`);
}

regenerateAll().catch(console.error);
