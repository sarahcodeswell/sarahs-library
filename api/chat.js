import { distributedRateLimit, checkDailyLimit, getRateLimitHeaders } from './utils/distributedRateLimit.js';
import { getClientIdentifier } from './utils/auth.js';
import { validateMessages, sanitizeUserInput } from './utils/inputSanitization.js';
import { trackCost } from './utils/costMonitoring.js';
import { getCorsHeaders, handlePreflight } from './utils/cors.js';
import { fetchWithRetry } from './utils/retry.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS headers - restricted to known domains
  const corsHeaders = getCorsHeaders(req);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Rate limiting - per minute
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await distributedRateLimit(clientId, {
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

    // Admin bypass for backfill scripts - MUST have env var set, no default
    const adminKey = req.headers.get('x-admin-key');
    const adminEnvKey = globalThis?.process?.env?.ADMIN_BACKFILL_KEY;
    const isAdmin = adminEnvKey && adminKey === adminEnvKey;

    // Check daily limit (100 API calls per day per user) - skip for admin
    if (!isAdmin) {
      const dailyLimitResult = await checkDailyLimit(clientId, 100);
      
      if (!dailyLimitResult.isAllowed) {
        return new Response(
          JSON.stringify({ 
            error: `Daily limit reached. You've used all ${dailyLimitResult.limit} API calls for today. Resets at midnight.`,
            remaining: 0,
            limit: dailyLimitResult.limit
          }),
          {
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
              'X-Daily-Limit': dailyLimitResult.limit.toString(),
              'X-Daily-Remaining': '0',
            },
          }
        );
      }
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

    // Sanitize and validate messages
    const messageValidation = validateMessages(body.messages);
    if (!messageValidation.valid) {
      return new Response(
        JSON.stringify({ error: messageValidation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Use sanitized messages
    body.messages = messageValidation.sanitized;

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

    // Call Anthropic API with retry logic for transient failures
    let response;
    let data;
    try {
      response = await fetchWithRetry(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'prompt-caching-2024-07-31',
          },
          body: JSON.stringify(body),
          timeout: 30000, // 30 second timeout for AI responses
        },
        { maxRetries: 2, initialDelay: 1000 }
      );
      data = await response.json();
    } catch (fetchError) {
      // If all retries failed (5xx errors or network issues)
      console.error('Anthropic API failed after retries:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Service temporarily unavailable',
          message: 'Please try again in a moment.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Log errors from Anthropic (4xx errors returned without retry)
    if (!response.ok) {
      console.error('Anthropic API error:', data);
    } else {
      // Track successful API call cost
      trackCost('recommendation');
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