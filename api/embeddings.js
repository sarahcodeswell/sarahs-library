// API endpoint to generate text embeddings using OpenAI
// This is used by the vector search functionality

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase for rate limiting
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Rate limiting check (optional - skip if table doesn't exist)
    const userId = req.headers['x-user-id'];
    if (userId) {
      try {
        const { data: rateLimit, error: rateLimitError } = await supabase
          .from('api_usage')
          .select('count')
          .eq('user_id', userId)
          .eq('endpoint', 'embeddings')
          .gte('created_at', new Date(Date.now() - 60000).toISOString())
          .single();

        // Only enforce rate limit if table exists and has data
        if (!rateLimitError && rateLimit && rateLimit.count > 10) {
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        // Try to log usage (ignore errors if table doesn't exist)
        if (!rateLimitError) {
          await supabase
            .from('api_usage')
            .insert({
              user_id: userId,
              endpoint: 'embeddings',
              created_at: new Date().toISOString()
            }).catch(() => {}); // Silently ignore insert errors
        }
      } catch (e) {
        // Rate limiting is optional, continue without it
        console.log('Rate limiting skipped:', e.message);
      }
    }

    // Generate embedding
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim(),
    });

    const embedding = response.data[0].embedding;

    // Return the embedding
    res.status(200).json({
      embedding,
      dimensions: embedding.length,
      model: "text-embedding-3-small"
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ 
        error: 'OpenAI quota exceeded',
        message: 'Unable to generate embeddings at this time'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(500).json({ 
        error: 'API configuration error',
        message: 'Unable to process request'
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate embedding',
      message: error.message
    });
  }
}
