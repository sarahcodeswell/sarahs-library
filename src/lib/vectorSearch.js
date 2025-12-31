// Vector search utilities for semantic book recommendations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Find books similar to a text query using vector search
 * @param {string} query - User's query text
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Minimum similarity threshold
 * @returns {Promise<Array>} Array of similar books with similarity scores
 */
export async function findSimilarBooks(query, limit = 10, threshold = 0.7) {
  try {
    // First, generate embedding for the query
    const embeddingResponse = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const { embedding } = await embeddingResponse.json();

    // Search for similar books
    const { data, error } = await supabase
      .rpc('find_similar_books', {
        query_embedding: embedding,
        limit_count: limit,
        similarity_threshold: threshold
      });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * Get books by specific themes with vector ranking
 * @param {Array<string>} themes - Array of theme names
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of books matching themes
 */
export async function getBooksByThemes(themes, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .contains('themes', themes)
      .limit(limit);

    if (error) {
      console.error('Theme search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Theme search failed:', error);
    return [];
  }
}

/**
 * Get Sarah's assessment for a specific book
 * @param {string} title - Book title
 * @returns {Promise<string|null>} Sarah's assessment or null
 */
export async function getSarahAssessment(title) {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('sarah_assessment')
      .eq('title', title)
      .single();

    if (error) {
      console.error('Assessment lookup error:', error);
      return null;
    }

    return data?.sarah_assessment || null;
  } catch (error) {
    console.error('Assessment lookup failed:', error);
    return null;
  }
}

/**
 * Get random books for diversity in recommendations
 * @param {number} count - Number of random books
 * @param {Array<string>} excludeTitles - Titles to exclude
 * @returns {Promise<Array>} Array of random books
 */
export async function getRandomBooks(count = 10, excludeTitles = []) {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .not('title', 'in', `(${excludeTitles.join(',')})`);

    // Add random ordering (PostgreSQL specific)
    const { data, error } = await query.order('RANDOM()').limit(count);

    if (error) {
      console.error('Random books error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Random books failed:', error);
    return [];
  }
}
