// Debug endpoint to check database connectivity and function availability
// TEMPORARY - remove after debugging

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  const results = {
    timestamp: new Date().toISOString(),
    supabaseUrl: supabaseUrl ? 'configured' : 'missing',
    supabaseAnonKey: supabaseAnonKey ? 'configured' : 'missing',
    tests: {}
  };
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ ...results, error: 'Missing Supabase config' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test 1: Can we query the books table?
  try {
    const { data, error, count } = await supabase
      .from('books')
      .select('id, title', { count: 'exact' })
      .limit(3);
    
    results.tests.booksTable = {
      success: !error,
      count: count,
      sample: data?.map(b => b.title),
      error: error?.message
    };
  } catch (e) {
    results.tests.booksTable = { success: false, error: e.message };
  }
  
  // Test 2: Can we call find_similar_books RPC?
  try {
    // Create a dummy embedding (all zeros)
    const dummyEmbedding = new Array(1536).fill(0);
    
    const { data, error } = await supabase
      .rpc('find_similar_books', {
        query_embedding: dummyEmbedding,
        limit_count: 3,
        similarity_threshold: 0.0
      });
    
    results.tests.findSimilarBooks = {
      success: !error,
      resultCount: data?.length || 0,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details
    };
  } catch (e) {
    results.tests.findSimilarBooks = { success: false, error: e.message };
  }
  
  // Test 3: Check if books have embeddings
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, embedding')
      .not('embedding', 'is', null)
      .limit(1);
    
    results.tests.booksWithEmbeddings = {
      success: !error,
      hasEmbeddings: data?.length > 0,
      sampleTitle: data?.[0]?.title,
      embeddingLength: data?.[0]?.embedding?.length,
      error: error?.message
    };
  } catch (e) {
    results.tests.booksWithEmbeddings = { success: false, error: e.message };
  }
  
  return res.status(200).json(results);
}
