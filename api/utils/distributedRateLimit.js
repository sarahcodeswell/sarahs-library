// Distributed rate limiter using Upstash Redis
// Works across multiple Edge function instances for true rate limiting at scale

import { Redis } from '@upstash/redis';

// Initialize Redis client (lazy initialization)
let redis = null;

function getRedisClient() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      console.warn('Upstash Redis not configured, falling back to in-memory rate limiting');
      return null;
    }
    
    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
}

/**
 * Distributed rate limiter using Redis
 * @param {string} identifier - Unique identifier (e.g., user ID, IP address)
 * @param {object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests allowed in window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {Promise<object>} Rate limit result
 */
export async function distributedRateLimit(identifier, options = {}) {
  const {
    maxRequests = 20,
    windowMs = 60 * 1000, // 1 minute default
  } = options;

  const redisClient = getRedisClient();
  
  // Fallback to in-memory if Redis not available
  if (!redisClient) {
    return fallbackRateLimit(identifier, options);
  }

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    
    // Increment counter
    pipeline.incr(key);
    
    // Set expiry if key is new
    pipeline.pexpire(key, windowMs);
    
    // Get TTL to calculate reset time
    pipeline.pttl(key);
    
    const results = await pipeline.exec();
    const count = results[0];
    const ttl = results[2];
    
    const isAllowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetIn = ttl > 0 ? ttl : windowMs;
    
    return {
      isAllowed,
      remaining,
      resetIn,
      limit: maxRequests,
      count,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to allowing request on Redis errors
    return {
      isAllowed: true,
      remaining: maxRequests,
      resetIn: windowMs,
      limit: maxRequests,
      count: 0,
      error: 'Rate limit check failed',
    };
  }
}

/**
 * Check daily API usage for a user
 * @param {string} userId - User ID
 * @param {number} dailyLimit - Maximum API calls per day
 * @returns {Promise<object>} Daily usage result
 */
export async function checkDailyLimit(userId, dailyLimit = 100) {
  const redisClient = getRedisClient();
  
  if (!redisClient) {
    // No Redis - allow request
    return {
      isAllowed: true,
      remaining: dailyLimit,
      count: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `daily:${userId}:${today}`;
  
  try {
    const count = await redisClient.incr(key);
    
    // Set expiry to end of day (24 hours from now)
    if (count === 1) {
      await redisClient.expire(key, 86400); // 24 hours
    }
    
    const isAllowed = count <= dailyLimit;
    const remaining = Math.max(0, dailyLimit - count);
    
    return {
      isAllowed,
      remaining,
      count,
      limit: dailyLimit,
    };
  } catch (error) {
    console.error('Daily limit check error:', error);
    // Fallback to allowing request
    return {
      isAllowed: true,
      remaining: dailyLimit,
      count: 0,
      error: 'Daily limit check failed',
    };
  }
}

/**
 * Get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + rateLimitResult.resetIn).toISOString(),
  };
}

// Fallback in-memory rate limiter (same as original)
const memoryStore = new Map();
let cleanupInterval = null;

function startMemoryCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
      if (now > data.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function fallbackRateLimit(identifier, options = {}) {
  const {
    maxRequests = 20,
    windowMs = 60 * 1000,
  } = options;

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
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
    count: record.count,
  };
}
