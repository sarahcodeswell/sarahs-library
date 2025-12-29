// Cost monitoring and alerting for API usage
// Tracks approximate costs and logs warnings when thresholds are exceeded

const costTracking = new Map();
let dailyResetInterval = null;

// Approximate costs per API call (in USD)
const COSTS = {
  recommendation: 0.015, // ~$0.015 per recommendation (with caching)
  photo_recognition: 0.025, // ~$0.025 per photo recognition
};

// Cost thresholds for alerts
const THRESHOLDS = {
  daily: 10.00, // Alert if daily costs exceed $10
  hourly: 2.00, // Alert if hourly costs exceed $2
};

function startDailyReset() {
  if (dailyResetInterval) return;
  
  // Reset daily costs at midnight
  dailyResetInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      costTracking.clear();
      console.log('[Cost Monitor] Daily costs reset');
    }
  }, 60 * 1000); // Check every minute
}

/**
 * Track API usage and estimated costs
 * @param {string} action - Action type ('recommendation', 'photo_recognition')
 * @returns {Object} - { estimatedCost: number, dailyTotal: number, hourlyTotal: number }
 */
export function trackCost(action) {
  startDailyReset();
  
  const cost = COSTS[action] || 0;
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  // Get or create tracking record
  const dailyKey = `daily:${new Date().toDateString()}`;
  const hourlyKey = `hourly:${Math.floor(now / (60 * 60 * 1000))}`;
  
  const dailyRecord = costTracking.get(dailyKey) || { total: 0, count: 0 };
  const hourlyRecord = costTracking.get(hourlyKey) || { total: 0, count: 0 };
  
  // Update costs
  dailyRecord.total += cost;
  dailyRecord.count += 1;
  hourlyRecord.total += cost;
  hourlyRecord.count += 1;
  
  costTracking.set(dailyKey, dailyRecord);
  costTracking.set(hourlyKey, hourlyRecord);
  
  // Check thresholds and log warnings
  if (dailyRecord.total > THRESHOLDS.daily) {
    console.warn(`[Cost Monitor] ⚠️ Daily cost threshold exceeded: $${dailyRecord.total.toFixed(2)} (${dailyRecord.count} requests)`);
  }
  
  if (hourlyRecord.total > THRESHOLDS.hourly) {
    console.warn(`[Cost Monitor] ⚠️ Hourly cost threshold exceeded: $${hourlyRecord.total.toFixed(2)} (${hourlyRecord.count} requests)`);
  }
  
  // Log every 100 requests
  if (dailyRecord.count % 100 === 0) {
    console.log(`[Cost Monitor] Daily stats: $${dailyRecord.total.toFixed(2)} (${dailyRecord.count} requests)`);
  }
  
  return {
    estimatedCost: cost,
    dailyTotal: dailyRecord.total,
    hourlyTotal: hourlyRecord.total,
    dailyCount: dailyRecord.count,
  };
}

/**
 * Get current cost statistics
 * @returns {Object} - Cost statistics
 */
export function getCostStats() {
  const dailyKey = `daily:${new Date().toDateString()}`;
  const hourlyKey = `hourly:${Math.floor(Date.now() / (60 * 60 * 1000))}`;
  
  const dailyRecord = costTracking.get(dailyKey) || { total: 0, count: 0 };
  const hourlyRecord = costTracking.get(hourlyKey) || { total: 0, count: 0 };
  
  return {
    daily: {
      total: dailyRecord.total,
      count: dailyRecord.count,
      threshold: THRESHOLDS.daily,
      percentUsed: (dailyRecord.total / THRESHOLDS.daily) * 100,
    },
    hourly: {
      total: hourlyRecord.total,
      count: hourlyRecord.count,
      threshold: THRESHOLDS.hourly,
      percentUsed: (hourlyRecord.total / THRESHOLDS.hourly) * 100,
    },
  };
}
