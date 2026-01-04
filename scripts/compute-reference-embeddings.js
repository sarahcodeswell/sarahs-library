/**
 * Compute Reference Embeddings for Deterministic Router
 * 
 * This script computes and stores:
 * 1. Sarah's taste centroid (via SQL function)
 * 2. Theme centroids (via SQL function)
 * 3. Genre centroids (via SQL function)
 * 4. Anti-pattern embeddings (via OpenAI API)
 * 
 * Run this script after:
 * - Initial database setup
 * - Adding new books to the catalog
 * - Changing theme/genre assignments
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
  console.error('- OPENAI_API_KEY:', !!openaiApiKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Anti-pattern descriptions from the spec
const ANTI_PATTERN_DESCRIPTIONS = {
  pure_escapism: `
    Light, fun, easy read. Beach book. Vacation read. 
    No heavy themes. Pure entertainment. Don't want to think. 
    Just want to relax. Escapist fiction. Feel-good only.
    Nothing too serious. Light-hearted. Palate cleanser.
    Quick read. Page-turner without depth. Guilty pleasure.
  `,
  
  plot_over_character: `
    Fast-paced action. Thriller with lots of twists.
    Plot-driven. Page-turner. Can't put it down.
    Action-packed. High stakes. Suspenseful.
    Don't care about character development, just want excitement.
    Blockbuster style. Movie-like. Adrenaline rush.
  `,
  
  formulaic_genre: `
    Cozy mystery. Hallmark romance. Clean romance.
    Predictable but comforting. Formula fiction.
    I know what I'm getting. Comfort read.
    Series with familiar characters. No surprises.
    Sweet romance. Closed door. Happily ever after guaranteed.
  `
};

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim(),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function computeTasteCentroid() {
  console.log('\n📊 Computing Sarah\'s taste centroid...');
  
  const { error } = await supabase.rpc('compute_taste_centroid');
  
  if (error) {
    console.error('Error computing taste centroid:', error);
    return false;
  }
  
  console.log('✅ Taste centroid computed');
  return true;
}

async function computeThemeCentroids() {
  console.log('\n🏷️ Computing theme centroids...');
  
  const { error } = await supabase.rpc('compute_theme_centroids');
  
  if (error) {
    console.error('Error computing theme centroids:', error);
    return false;
  }
  
  console.log('✅ Theme centroids computed');
  return true;
}

async function computeGenreCentroids() {
  console.log('\n📚 Computing genre centroids...');
  
  const { error } = await supabase.rpc('compute_genre_centroids');
  
  if (error) {
    console.error('Error computing genre centroids:', error);
    return false;
  }
  
  console.log('✅ Genre centroids computed');
  return true;
}

async function computeAntiPatternEmbeddings() {
  console.log('\n⚠️ Computing anti-pattern embeddings...');
  
  for (const [patternName, description] of Object.entries(ANTI_PATTERN_DESCRIPTIONS)) {
    console.log(`  Processing: ${patternName}`);
    
    const embedding = await generateEmbedding(description);
    
    if (!embedding) {
      console.error(`  ❌ Failed to generate embedding for ${patternName}`);
      continue;
    }
    
    const { error } = await supabase
      .from('reference_embeddings')
      .upsert({
        reference_type: 'anti_pattern',
        reference_name: patternName,
        embedding: embedding,
        source_book_count: null,
        metadata: { description: description.trim() },
        computed_at: new Date().toISOString()
      }, {
        onConflict: 'reference_type,reference_name'
      });
    
    if (error) {
      console.error(`  ❌ Error storing ${patternName}:`, error);
    } else {
      console.log(`  ✅ ${patternName} stored`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return true;
}

async function verifyReferenceEmbeddings() {
  console.log('\n🔍 Verifying reference embeddings...');
  
  const { data, error } = await supabase
    .from('reference_embeddings')
    .select('reference_type, reference_name, source_book_count, computed_at')
    .order('reference_type')
    .order('reference_name');
  
  if (error) {
    console.error('Error fetching reference embeddings:', error);
    return;
  }
  
  console.log('\nStored reference embeddings:');
  console.log('─'.repeat(60));
  
  let currentType = '';
  for (const row of data) {
    if (row.reference_type !== currentType) {
      currentType = row.reference_type;
      console.log(`\n${currentType.toUpperCase()}:`);
    }
    const bookCount = row.source_book_count ? ` (${row.source_book_count} books)` : '';
    console.log(`  - ${row.reference_name}${bookCount}`);
  }
  
  console.log('\n─'.repeat(60));
  console.log(`Total: ${data.length} reference embeddings`);
}

async function verifyBooksData() {
  console.log('\n📖 Verifying books data...');
  
  // Check total books
  const { count: totalBooks } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true });
  
  // Check books with embeddings
  const { count: withEmbeddings } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  // Check books with themes
  const { count: withThemes } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .not('themes', 'is', null)
    .not('themes', 'eq', '{}');
  
  // Get theme distribution
  const { data: themeData } = await supabase
    .from('books')
    .select('themes')
    .not('themes', 'is', null);
  
  const themeCounts = {};
  for (const book of themeData || []) {
    for (const theme of book.themes || []) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  }
  
  console.log(`\nBooks table status:`);
  console.log(`  Total books: ${totalBooks}`);
  console.log(`  With embeddings: ${withEmbeddings}`);
  console.log(`  With themes: ${withThemes}`);
  
  console.log(`\nTheme distribution:`);
  for (const [theme, count] of Object.entries(themeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${theme}: ${count} books`);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('REFERENCE EMBEDDINGS COMPUTATION');
  console.log('═'.repeat(60));
  
  // First verify the books data
  await verifyBooksData();
  
  // Compute all reference embeddings
  await computeTasteCentroid();
  await computeThemeCentroids();
  await computeGenreCentroids();
  await computeAntiPatternEmbeddings();
  
  // Verify what was stored
  await verifyReferenceEmbeddings();
  
  console.log('\n═'.repeat(60));
  console.log('COMPUTATION COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
