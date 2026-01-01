// One-time script to regenerate descriptions and fetch ISBNs for all books
import { createClient } from '@supabase/supabase-js';
import { generateBookDescriptions } from './src/lib/descriptionService.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Open Library API for ISBN lookup
async function fetchISBN(title, author) {
  try {
    // Clean title for search
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
        firstPublishYear: book.first_publish_year || null,
        editionCount: book.edition_count || 0
      };
    }
  } catch (error) {
    console.log(`ISBN lookup failed for "${title}":`, error.message);
  }
  return null;
}

async function regenerateAllDescriptions() {
  console.log('Starting one-time description regeneration...\n');
  
  // Get all books without descriptions
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author, description, status')
    .or('description.is.null,description.eq.');
  
  if (error) {
    console.error('Error fetching books:', error);
    return;
  }
  
  console.log(`Found ${books.length} books needing descriptions\n`);
  
  const batchSize = 10;
  let updatedCount = 0;
  let isbnCount = 0;
  
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(books.length / batchSize);
    
    console.log(`\n=== Batch ${batchNum}/${totalBatches} ===`);
    
    // Prepare books for AI
    const booksForAI = batch.map(b => ({ 
      title: b.book_title, 
      author: b.book_author || '' 
    }));
    
    try {
      // Generate descriptions
      console.log('Generating AI descriptions...');
      const descriptions = await generateBookDescriptions(booksForAI);
      
      // Update each book
      for (const book of batch) {
        const key = `${book.book_title.toLowerCase()}|${(book.book_author || '').toLowerCase()}`;
        const description = descriptions[key];
        
        if (description) {
          // Fetch ISBN
          console.log(`Fetching ISBN for "${book.book_title}"...`);
          const isbnData = await fetchISBN(book.book_title, book.book_author);
          
          if (isbnData?.isbn) {
            isbnCount++;
            console.log(`  ✓ Found ISBN: ${isbnData.isbn}`);
          }
          
          // Update database
          const updateData = { description };
          if (isbnData?.isbn) {
            updateData.isbn = isbnData.isbn;
            updateData.isbn10 = isbnData.isbn10;
            updateData.isbn13 = isbnData.isbn13;
            updateData.open_library_key = isbnData.openLibraryKey;
            updateData.first_publish_year = isbnData.firstPublishYear;
          }
          
          const { error: updateError } = await supabase
            .from('reading_queue')
            .update(updateData)
            .eq('id', book.id);
          
          if (updateError) {
            console.error(`  ❌ Failed to update:`, updateError.message);
          } else {
            console.log(`  ✓ Updated with description${isbnData?.isbn ? ' + ISBN' : ''}`);
            updatedCount++;
          }
        } else {
          console.log(`  ❌ No description generated for "${book.book_title}"`);
        }
      }
      
      // Wait between batches to avoid rate limits
      if (i + batchSize < books.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (batchError) {
      console.error(`Batch ${batchNum} failed:`, batchError.message);
    }
  }
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Total books processed: ${books.length}`);
  console.log(`Descriptions generated: ${updatedCount}`);
  console.log(`ISBNs found: ${isbnCount}`);
  console.log(`Success rate: ${Math.round(updatedCount/books.length*100)}%`);
}

// Run it
regenerateAllDescriptions().catch(console.error);
