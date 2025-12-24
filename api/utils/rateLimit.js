// Simple in-memory rate limiter for Edge runtime
// For production, consider using Vercel KV or Upstash Redis

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(identifier, options = {}) {
  const {
    maxRequests = 20, // requests per window
    windowMs = 60 * 1000, // 1 minute window
  } = options;

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new window
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, record);
  }
  
  record.count++;
  
  const isAllowed = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetIn = Math.max(0, record.resetTime - now);
  
  return {
    isAllowed,
    remaining,
    resetIn,
    limit: maxRequests,
  };
}

export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + rateLimitResult.resetIn).toISOString(),
  };
}
