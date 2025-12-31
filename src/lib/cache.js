// Simple in-memory cache for development
// In production, use Redis

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  size() {
    return this.cache.size;
  }
}

// Cache instances for different purposes
export const cache = new SimpleCache();

// Specific cache helpers
export const cacheUtils = {
  // Cache book recommendations
  cacheRecommendations: (userId, message, recommendations) => {
    const key = `recs:${userId}:${message.slice(0, 50)}`;
    cache.set(key, recommendations, 10 * 60 * 1000); // 10 minutes
  },

  getCachedRecommendations: (userId, message) => {
    const key = `recs:${userId}:${message.slice(0, 50)}`;
    return cache.get(key);
  },

  // Cache embeddings
  cacheEmbedding: (text, embedding) => {
    const key = `embed:${text.slice(0, 100)}`;
    cache.set(key, embedding, 60 * 60 * 1000); // 1 hour
  },

  getCachedEmbedding: (text) => {
    const key = `embed:${text.slice(0, 100)}`;
    return cache.get(key);
  },

  // Cache user preferences
  cacheUserPreferences: (userId, preferences) => {
    const key = `prefs:${userId}`;
    cache.set(key, preferences, 30 * 60 * 1000); // 30 minutes
  },

  getCachedUserPreferences: (userId) => {
    const key = `prefs:${userId}`;
    return cache.get(key);
  },

  // Cache reading queue
  cacheReadingQueue: (userId, queue) => {
    const key = `queue:${userId}`;
    cache.set(key, queue, 2 * 60 * 1000); // 2 minutes
  },

  getCachedReadingQueue: (userId) => {
    const key = `queue:${userId}`;
    return cache.get(key);
  },

  // Invalidate user-specific cache
  invalidateUserCache: (userId) => {
    const keysToDelete = [];
    for (const key of cache.cache.keys()) {
      if (key.includes(`:${userId}:`) || key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  }
};

// Auto-cleanup every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);
