// Distributed rate limiter using Vercel KV
// Falls back to in-memory for development

import { kv } from '@vercel/kv';

const WINDOW_MS = 60000; // 1 minute window
const MAX_REQUESTS = {
  chat: 10,       // 10 chat requests per minute
  embeddings: 20, // 20 embedding requests per minute
  upload: 5,      // 5 file uploads per minute
  api: 50         // 50 general API requests per minute
};

// In-memory fallback for development
const memoryStore = new Map();

/**
 * Check if KV is available (production with proper env vars)
 */
function isKVAvailable() {
  return typeof kv !== 'undefined' && process.env.KV_REST_API_URL;
}

/**
 * Get rate limit key for KV storage
 */
function getRateLimitKey(userId, endpoint) {
  return `ratelimit:${endpoint}:${userId}`;
}

/**
 * Check rate limit using Vercel KV (distributed)
 */
async function checkRateLimitKV(userId, endpoint) {
  const key = getRateLimitKey(userId, endpoint);
  const maxRequests = MAX_REQUESTS[endpoint] || MAX_REQUESTS.api;
  const now = Date.now();
  
  try {
    // Get current count
    const data = await kv.get(key);
    
    if (!data) {
      // First request - set with TTL
      await kv.set(key, { count: 1, resetTime: now + WINDOW_MS }, { px: WINDOW_MS });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + WINDOW_MS };
    }
    
    // Check if window expired
    if (now > data.resetTime) {
      await kv.set(key, { count: 1, resetTime: now + WINDOW_MS }, { px: WINDOW_MS });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + WINDOW_MS };
    }
    
    // Check if over limit
    if (data.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: data.resetTime };
    }
    
    // Increment count
    const newCount = data.count + 1;
    const ttl = data.resetTime - now;
    await kv.set(key, { count: newCount, resetTime: data.resetTime }, { px: Math.max(ttl, 1000) });
    
    return { allowed: true, remaining: maxRequests - newCount, resetTime: data.resetTime };
  } catch (err) {
    // On KV error, allow request but log
    console.error('[RateLimiter] KV error:', err.message);
    return { allowed: true, remaining: maxRequests, resetTime: now + WINDOW_MS };
  }
}

/**
 * Check rate limit using in-memory store (development fallback)
 */
function checkRateLimitMemory(userId, endpoint) {
  const key = getRateLimitKey(userId, endpoint);
  const maxRequests = MAX_REQUESTS[endpoint] || MAX_REQUESTS.api;
  const now = Date.now();
  
  let data = memoryStore.get(key);
  
  if (!data || now > data.resetTime) {
    data = { count: 1, resetTime: now + WINDOW_MS };
    memoryStore.set(key, data);
    return { allowed: true, remaining: maxRequests - 1, resetTime: data.resetTime };
  }
  
  if (data.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: data.resetTime };
  }
  
  data.count++;
  memoryStore.set(key, data);
  
  // Cleanup old entries occasionally
  if (Math.random() < 0.01) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetTime) memoryStore.delete(k);
    }
  }
  
  return { allowed: true, remaining: maxRequests - data.count, resetTime: data.resetTime };
}

/**
 * Main rate limit check - uses KV in production, memory in dev
 */
export async function checkRateLimit(userId, endpoint = 'api') {
  if (isKVAvailable()) {
    return checkRateLimitKV(userId, endpoint);
  }
  return checkRateLimitMemory(userId, endpoint);
}

/**
 * Middleware for API routes
 */
export function createRateLimitMiddleware(endpoint = 'api') {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'] || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.ip || 
                   'anonymous';
    
    const result = await checkRateLimit(userId, endpoint);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS[endpoint] || MAX_REQUESTS.api);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter
      });
    }
    
    next();
  };
}

// Legacy exports for backward compatibility
export const rateLimiter = {
  isAllowed: (userId, endpoint) => {
    const result = checkRateLimitMemory(userId, endpoint);
    return result.allowed;
  },
  getRemainingRequests: (userId, endpoint) => {
    const key = getRateLimitKey(userId, endpoint);
    const data = memoryStore.get(key);
    if (!data || Date.now() > data.resetTime) {
      return MAX_REQUESTS[endpoint] || MAX_REQUESTS.api;
    }
    return Math.max(0, (MAX_REQUESTS[endpoint] || MAX_REQUESTS.api) - data.count);
  },
  getResetTime: (userId, endpoint) => {
    const key = getRateLimitKey(userId, endpoint);
    const data = memoryStore.get(key);
    return data ? data.resetTime : Date.now() + WINDOW_MS;
  },
  MAX_REQUESTS
};
