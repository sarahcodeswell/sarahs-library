// Simple in-memory rate limiter for Edge runtime
// Optimized to prevent memory leaks with automatic cleanup

const memoryStore = new Map();
let cleanupInterval = null;

// Start cleanup only once
function startMemoryCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
      if (now > data.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean up every 5 minutes
}

export function rateLimit(identifier, options = {}) {
  const {
    maxRequests = 20,
    windowMs = 60 * 1000,
  } = options;

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  // Start cleanup on first use
  startMemoryCleanup();
  
  let record = memoryStore.get(key);
  
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, record);
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
