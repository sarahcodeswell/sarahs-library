import { rateLimit, getRateLimitHeaders } from './utils/rateLimit.js';
import { getClientIdentifier } from './utils/auth.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(clientId, {
      maxRequests: 30, // 30 requests per minute
      windowMs: 60 * 1000,
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.isAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          resetIn: rateLimitResult.resetIn 
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...rateLimitHeaders,
          },
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate API key is configured
    const apiKey = globalThis?.process?.env?.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log errors from Anthropic
    if (!response.ok) {
      console.error('Anthropic API error:', data);
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
        ...rateLimitHeaders,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}