// Simple in-memory rate limiter for development
// In production, use Redis-based rate limiting

class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> { count, resetTime }
    this.WINDOW_MS = 60000; // 1 minute
    this.MAX_REQUESTS = {
      chat: 10, // 10 chat requests per minute
      embeddings: 20, // 20 embedding requests per minute
      upload: 5, // 5 file uploads per minute
      api: 50 // 50 general API requests per minute
    };
  }

  isAllowed(userId, endpoint = 'api') {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || { count: 0, resetTime: now + this.WINDOW_MS };
    
    // Reset window if expired
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + this.WINDOW_MS;
    }
    
    const maxRequests = this.MAX_REQUESTS[endpoint] || this.MAX_REQUESTS.api;
    
    if (userRequests.count >= maxRequests) {
      return false;
    }
    
    userRequests.count++;
    this.requests.set(userId, userRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      this.cleanup();
    }
    
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [userId, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(userId);
      }
    }
  }
  
  getRemainingRequests(userId, endpoint = 'api') {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || { count: 0, resetTime: now + this.WINDOW_MS };
    
    if (now > userRequests.resetTime) {
      return this.MAX_REQUESTS[endpoint] || this.MAX_REQUESTS.api;
    }
    
    const maxRequests = this.MAX_REQUESTS[endpoint] || this.MAX_REQUESTS.api;
    return Math.max(0, maxRequests - userRequests.count);
  }
  
  getResetTime(userId) {
    const userRequests = this.requests.get(userId);
    return userRequests ? userRequests.resetTime : Date.now() + this.WINDOW_MS;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Express middleware for rate limiting
export function createRateLimitMiddleware(endpoint = 'api') {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.ip || 'anonymous';
    
    if (!rateLimiter.isAllowed(userId, endpoint)) {
      const resetTime = rateLimiter.getResetTime(userId);
      const remaining = Math.ceil((resetTime - Date.now()) / 1000);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${remaining} seconds.`,
        resetTime,
        remaining
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimiter.MAX_REQUESTS[endpoint] || rateLimiter.MAX_REQUESTS.api,
      'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(userId, endpoint),
      'X-RateLimit-Reset': rateLimiter.getResetTime(userId)
    });
    
    next();
  };
}
