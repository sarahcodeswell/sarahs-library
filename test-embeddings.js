// Test embeddings with just 5 books
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load just first 5 books
const booksPath = path.join(process.cwd(), 'src', 'books.json');
const allBooks = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const books = allBooks.slice(0, 5); // Just 5 books for testing

async function generateEmbedding(book) {
  const text = `
    Title: ${book.title}
    Author: ${book.author || 'Unknown'}
    Description: ${book.description || ''}
    Themes: ${(book.themes || []).join(', ')}
    Sarah's Assessment: ${book.sarah_assessment || ''}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error(`Error for "${book.title}":`, error.message);
    return null;
  }
}

async function testEmbeddings() {
  console.log(`Testing ${books.length} books...`);
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\n[${i + 1}/${books.length}] Testing: ${book.title}`);
    
    const embedding = await generateEmbedding(book);
    if (embedding) {
      console.log(`✅ Success! Embedding dimensions: ${embedding.length}`);
      
      // Test database insertion
      const { error } = await supabase
        .from('books')
        .upsert({
          title: book.title,
          author: book.author,
          description: book.description,
          themes: book.themes || [],
          sarah_assessment: book.sarah_assessment,
          embedding: embedding,
        });
      
      if (error) {
        console.error(`❌ Database error:`, error.message);
      } else {
        console.log(`✅ Inserted into database`);
      }
    }
  }
  
  console.log('\n✅ Test complete!');
}

testEmbeddings();
