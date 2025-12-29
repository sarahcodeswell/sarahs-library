// Per-user daily limits to prevent API cost abuse
// Uses in-memory storage (resets on deployment, but that's acceptable for free tier)

const userLimits = new Map();
let cleanupInterval = null;

// Clean up old entries every hour
function startCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const [key, data] of userLimits.entries()) {
      if (data.resetTime < oneDayAgo) {
        userLimits.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Clean up every hour
}

/**
 * Check if user has exceeded daily limits
 * @param {string} userId - User identifier (IP or auth ID)
 * @param {string} action - Action type ('recommendation', 'photo_recognition')
 * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkDailyLimit(userId, action = 'recommendation') {
  const limits = {
    recommendation: 50, // 50 recommendations per day
    photo_recognition: 20, // 20 photo recognitions per day
  };
  
  const maxRequests = limits[action] || 50;
  const now = Date.now();
  const key = `daily:${userId}:${action}`;
  
  startCleanup();
  
  let record = userLimits.get(key);
  
  // Reset if it's a new day
  if (!record || now > record.resetTime) {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // Reset at midnight
    
    record = {
      count: 0,
      resetTime: tomorrow.getTime(),
    };
    userLimits.set(key, record);
  }
  
  record.count++;
  
  const allowed = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);
  
  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
    limit: maxRequests,
  };
}

/**
 * Get current usage for a user
 * @param {string} userId - User identifier
 * @param {string} action - Action type
 * @returns {Object} - { count: number, limit: number, remaining: number }
 */
export function getUserUsage(userId, action = 'recommendation') {
  const limits = {
    recommendation: 50,
    photo_recognition: 20,
  };
  
  const maxRequests = limits[action] || 50;
  const key = `daily:${userId}:${action}`;
  const record = userLimits.get(key);
  
  if (!record) {
    return {
      count: 0,
      limit: maxRequests,
      remaining: maxRequests,
    };
  }
  
  return {
    count: record.count,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
  };
}
