// Generate embeddings for Sarah's 200 books
// Run this script once to populate the books table with embeddings

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin access
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Load Sarah's book catalog (enriched with ISBNs)
const booksPath = path.join(process.cwd(), 'src', 'books-enriched.json');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Function to generate embedding for a book
async function generateEmbedding(book) {
  // Note: "Themes" are Sarah's curator themes (women, emotional, identity, justice, spiritual)
  // "Genre" is the book category (Literary Fiction, Memoir, Thriller, etc.)
  const text = `
    Title: ${book.title}
    Author: ${book.author || 'Unknown'}
    Genre: ${book.genre || ''}
    Description: ${book.description || ''}
    Curator Themes: ${(book.themes || []).join(', ')}
    Sarah's Assessment: ${book.sarah_assessment || ''}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embedding for "${book.title}":`, error);
    return null;
  }
}

// Main function to process all books
async function generateAllEmbeddings() {
  console.log(`Processing ${books.length} books...`);
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\n[${i + 1}/${books.length}] Processing: ${book.title}`);
    
    // Generate embedding
    const embedding = await generateEmbedding(book);
    if (!embedding) {
      console.log(`Skipping ${book.title} due to embedding error`);
      continue;
    }
    
    // Delete existing entry if present, then insert
    await supabase
      .from('books')
      .delete()
      .eq('title', book.title);
    
    const { error } = await supabase
      .from('books')
      .insert({
        title: book.title,
        author: book.author,
        genre: book.genre || null,
        description: book.description,
        themes: book.themes || [],
        sarah_assessment: book.sarah_assessment,
        isbn13: book.isbn13 || null,
        isbn10: book.isbn10 || null,
        cover_url: book.coverUrl || null,
        embedding: embedding,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Error inserting "${book.title}":`, error);
    } else {
      console.log(`✅ Inserted "${book.title}"`);
    }
    
    // Rate limiting to avoid OpenAI limits
    if (i < books.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n✅ All embeddings generated!');
}

// Function to test vector search
async function testVectorSearch() {
  console.log('\n🔍 Testing vector search...');
  
  // Search for books similar to "emotional" theme
  const queryEmbedding = await generateEmbedding({
    title: "Emotional devastating books",
    description: "Books that make you feel deeply emotional and think about life",
    themes: ["emotional", "women", "identity"]
  });
  
  if (!queryEmbedding) {
    console.error('Failed to generate query embedding');
    return;
  }
  
  const { data, error } = await supabase
    .rpc('find_similar_books', {
      query_embedding: queryEmbedding,
      limit_count: 5,
      similarity_threshold: 0.6
    });
  
  if (error) {
    console.error('Vector search error:', error);
    return;
  }
  
  console.log('\n📚 Similar books found:');
  data.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title} by ${book.author} (similarity: ${book.similarity.toFixed(3)})`);
  });
}

// Run the script
async function main() {
  try {
    await generateAllEmbeddings();
    await testVectorSearch();
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

main();
