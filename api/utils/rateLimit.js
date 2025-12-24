// Distributed rate limiter using Vercel KV (Redis)
// Falls back to in-memory for development/testing

// In-memory fallback for when KV is not available
const memoryStore = new Map();
let cleanupInterval = null;

// Start cleanup only if using memory store
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

async function getKV() {
  try {
    // Try to use Vercel KV if available
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    // KV not available, use memory store
    return null;
  }
}

export async function rateLimit(identifier, options = {}) {
  const {
    maxRequests = 20,
    windowMs = 60 * 1000,
  } = options;

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  const kv = await getKV();

  if (kv) {
    // Use distributed KV store
    try {
      const current = await kv.get(key);
      const count = current ? parseInt(current) + 1 : 1;
      
      if (count === 1) {
        // First request in window - set with expiry
        await kv.set(key, count, { px: windowMs });
      } else {
        // Increment existing counter
        await kv.set(key, count, { keepTtl: true });
      }
      
      const ttl = await kv.pttl(key);
      const resetIn = ttl > 0 ? ttl : windowMs;
      
      return {
        isAllowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetIn,
        limit: maxRequests,
      };
    } catch (error) {
      console.error('KV rate limit error:', error);
      // Fall through to memory store on error
    }
  }

  // Fallback to in-memory store
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
