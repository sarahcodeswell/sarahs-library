/**
 * API endpoint to fetch reference embeddings for deterministic router
 * GET /api/reference-embeddings
 * 
 * Returns pre-computed embeddings for:
 * - Sarah's taste centroid
 * - Theme centroids
 * - Genre centroids
 * - Anti-pattern embeddings
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[reference-embeddings] Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: `Missing: ${!supabaseUrl ? 'VITE_SUPABASE_URL ' : ''}${!supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`.trim()
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch all reference embeddings
    const { data, error } = await supabase
      .from('reference_embeddings')
      .select('reference_type, reference_name, embedding, source_book_count, computed_at');

    if (error) {
      console.error('[reference-embeddings] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch reference embeddings' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'No reference embeddings found',
        message: 'Run the compute-reference-embeddings.js script to generate them'
      });
    }

    // Transform into the format expected by the router
    const referenceEmbeddings = {
      sarahs_taste_centroid: null,
      themes: {},
      genres: {},
      antiPatterns: {},
      metadata: {
        computed_at: null,
        book_count: 0
      }
    };

    for (const row of data) {
      switch (row.reference_type) {
        case 'taste_centroid':
          referenceEmbeddings.sarahs_taste_centroid = row.embedding;
          referenceEmbeddings.metadata.book_count = row.source_book_count;
          referenceEmbeddings.metadata.computed_at = row.computed_at;
          break;
        case 'theme':
          referenceEmbeddings.themes[row.reference_name] = row.embedding;
          break;
        case 'genre':
          referenceEmbeddings.genres[row.reference_name] = row.embedding;
          break;
        case 'anti_pattern':
          referenceEmbeddings.antiPatterns[row.reference_name] = row.embedding;
          break;
      }
    }

    // Set cache headers (embeddings don't change often)
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

    return res.status(200).json({
      success: true,
      referenceEmbeddings,
      stats: {
        themes: Object.keys(referenceEmbeddings.themes).length,
        genres: Object.keys(referenceEmbeddings.genres).length,
        antiPatterns: Object.keys(referenceEmbeddings.antiPatterns).length,
        hasTasteCentroid: !!referenceEmbeddings.sarahs_taste_centroid
      }
    });

  } catch (err) {
    console.error('[reference-embeddings] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
