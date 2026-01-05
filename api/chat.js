import { rateLimit, getRateLimitHeaders } from './utils/rateLimit.js';
import { getClientIdentifier } from './utils/auth.js';
import { checkDailyLimit } from './utils/userLimits.js';
import { validateMessages, sanitizeUserInput } from './utils/inputSanitization.js';
import { trackCost } from './utils/costMonitoring.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
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
    const rateLimitResult = rateLimit(clientId, {
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

    // Check daily limit (50 recommendations per day per user) - skip for admin
    const dailyLimit = isAdmin ? { allowed: true } : checkDailyLimit(clientId, 'recommendation');
    
    if (!dailyLimit.allowed) {
      const resetDate = new Date(dailyLimit.resetTime);
      return new Response(
        JSON.stringify({ 
          error: `Daily limit reached. You've used all ${dailyLimit.limit} recommendations for today. Resets at midnight.`,
          resetTime: resetDate.toISOString(),
          remaining: 0
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
            'X-Daily-Limit': dailyLimit.limit.toString(),
            'X-Daily-Remaining': '0',
            'X-Daily-Reset': resetDate.toISOString(),
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