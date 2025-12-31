// Process embeddings in batches of 20 to avoid rate limits
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

// Load all books
const booksPath = path.join(process.cwd(), 'src', 'books.json');
const allBooks = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds between batches

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

async function processBatch(batchBooks, batchNumber) {
  console.log(`\n📦 Processing Batch ${batchNumber} (${batchBooks.length} books)...`);
  
  for (let i = 0; i < batchBooks.length; i++) {
    const book = batchBooks[i];
    const globalIndex = (batchNumber - 1) * BATCH_SIZE + i + 1;
    
    console.log(`[${globalIndex}/${allBooks.length}] ${book.title}`);
    
    const embedding = await generateEmbedding(book);
    if (embedding) {
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
        console.log(`✅ Added`);
      }
    }
    
    // Small delay between books
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function processAllBatches() {
  const totalBatches = Math.ceil(allBooks.length / BATCH_SIZE);
  console.log(`📚 Processing ${allBooks.length} books in ${totalBatches} batches of ${BATCH_SIZE}`);
  
  for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
    const start = (batchNum - 1) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = allBooks.slice(start, end);
    
    await processBatch(batch, batchNum);
    
    // Delay between batches (except last one)
    if (batchNum < totalBatches) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log('\n🎉 All batches complete!');
}

processAllBatches();
