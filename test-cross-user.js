// Test cross-user learning functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing cross-user learning system...\n');

  // 1. Test get_popular_books function
  console.log('1. Testing get_popular_books (min_rating=4, min_users=1):');
  const { data: popular, error: popErr } = await supabase.rpc('get_popular_books', {
    min_rating: 4,
    min_users: 1
  });
  
  if (popErr) {
    console.log('   Error:', popErr.message);
  } else {
    console.log(`   Found ${popular?.length || 0} popular books`);
    if (popular?.length > 0) {
      popular.slice(0, 5).forEach((b, i) => {
        console.log(`   ${i+1}. "${b.book_title}" - ${b.avg_rating}/5 (${b.user_count} user${b.user_count > 1 ? 's' : ''})`);
      });
    }
  }

  // 2. Test find_popular_similar_books with a sample embedding
  console.log('\n2. Testing find_popular_similar_books:');
  
  // Get a sample embedding from a book
  const { data: sampleBook } = await supabase
    .from('reading_queue')
    .select('book_title, embedding')
    .not('embedding', 'is', null)
    .limit(1)
    .single();

  if (sampleBook?.embedding) {
    console.log(`   Using embedding from "${sampleBook.book_title}"`);
    
    const { data: similar, error: simErr } = await supabase.rpc('find_popular_similar_books', {
      query_embedding: sampleBook.embedding,
      limit_count: 5,
      similarity_threshold: 0.5
    });

    if (simErr) {
      console.log('   Error:', simErr.message);
    } else {
      console.log(`   Found ${similar?.length || 0} similar books:`);
      similar?.forEach((b, i) => {
        console.log(`   ${i+1}. "${b.book_title}" by ${b.book_author} (sim: ${b.similarity?.toFixed(2)}, rating: ${b.avg_rating}/5)`);
      });
    }
  } else {
    console.log('   No sample embedding found');
  }

  // 3. Check genre distribution
  console.log('\n3. Genre distribution in reading_queue:');
  const { data: books } = await supabase
    .from('reading_queue')
    .select('genres')
    .not('genres', 'is', null);

  const genreCounts = {};
  (books || []).forEach(b => {
    (b.genres || []).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topGenres.forEach(([genre, count]) => {
    console.log(`   ${genre}: ${count} books`);
  });

  console.log('\n✓ Cross-user learning system ready!');
}

test().catch(console.error);
