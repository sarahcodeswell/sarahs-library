// CORS configuration for production security
// Restricts API access to known domains only

const ALLOWED_ORIGINS = [
  'https://sarahsbooks.com',
  'https://www.sarahsbooks.com',
  'https://sarahs-library.vercel.app',
  // Add localhost for development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

/**
 * Get CORS headers based on request origin
 * Returns restrictive headers for unknown origins
 */
export function getCorsHeaders(req) {
  const origin = req.headers?.get?.('origin') || req.headers?.origin || '';
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.vercel.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight request
 */
export function handlePreflight(req) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}
