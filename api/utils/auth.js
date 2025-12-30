// Authentication utilities for API endpoints

export async function getUserFromRequest(req) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token with Supabase
    const supabaseUrl = globalThis?.process?.env?.VITE_SUPABASE_URL;
    const supabaseServiceKey = globalThis?.process?.env?.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return null;
    }

    // Verify the JWT token
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseServiceKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
}

export function getClientIdentifier(req) {
  // Try to get user IP for rate limiting
  // Handle both Vercel (Headers object with .get()) and Express (plain object)
  const headers = req.headers;
  const forwarded = typeof headers.get === 'function' 
    ? headers.get('x-forwarded-for')
    : headers['x-forwarded-for'];
  const realIp = typeof headers.get === 'function'
    ? headers.get('x-real-ip')
    : headers['x-real-ip'];
  
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
  
  return ip;
}
