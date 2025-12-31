// Performance monitoring and optimization utilities

// Performance metrics tracking
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  // Track component render time
  trackRender(componentName, renderTime) {
    const key = `render:${componentName}`;
    const current = this.metrics.get(key) || [];
    current.push(renderTime);
    
    // Keep only last 100 measurements
    if (current.length > 100) {
      current.shift();
    }
    
    this.metrics.set(key, current);
    
    // Alert if performance is degrading
    const avg = current.reduce((a, b) => a + b, 0) / current.length;
    if (avg > 100) { // 100ms threshold
      console.warn(`⚠️ Slow render detected for ${componentName}: ${avg.toFixed(2)}ms avg`);
    }
  }

  // Track API response time
  trackApi(endpoint, duration) {
    const key = `api:${endpoint}`;
    const current = this.metrics.get(key) || [];
    current.push(duration);
    
    if (current.length > 100) {
      current.shift();
    }
    
    this.metrics.set(key, current);
    
    const avg = current.reduce((a, b) => a + b, 0) / current.length;
    if (avg > 2000) { // 2s threshold
      console.warn(`⚠️ Slow API detected for ${endpoint}: ${avg.toFixed(2)}ms avg`);
    }
  }

  // Get performance stats
  getStats() {
    const stats = {};
    for (const [key, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const p95 = values[Math.floor(values.length * 0.95)];
        
        stats[key] = {
          count: values.length,
          average: avg,
          min,
          max,
          p95
        };
      }
    }
    return stats;
  }

  // Clear metrics
  clear() {
    this.metrics.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export const performanceUtils = {
  // Debounce function for search inputs
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for scroll events
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize expensive computations
  memoize: (fn) => {
    const cache = new Map();
    return (...args) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  },

  // Lazy load images
  lazyLoadImage: (src, placeholder = null) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  },

  // Preload critical resources
  preloadResources: (resources) => {
    const promises = resources.map(resource => {
      if (resource.endsWith('.js') || resource.endsWith('.css')) {
        return fetch(resource);
      } else if (resource.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return performanceUtils.lazyLoadImage(resource);
      }
      return Promise.resolve();
    });
    
    return Promise.allSettled(promises);
  },

  // Measure component render performance
  measureRender: (componentName, renderFn) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    performanceMonitor.trackRender(componentName, end - start);
    return result;
  },

  // Measure API call performance
  measureApi: async (endpoint, apiCall) => {
    const start = performance.now();
    try {
      const result = await apiCall();
      const end = performance.now();
      performanceMonitor.trackApi(endpoint, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      performanceMonitor.trackApi(`${endpoint}:error`, end - start);
      throw error;
    }
  }
};

// React performance hooks
export const usePerformanceOptimization = () => {
  const [isOptimized, setIsOptimized] = React.useState(false);

  React.useEffect(() => {
    // Optimize for low-end devices
    const checkPerformance = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4; // < 4GB RAM
      
      setIsOptimized(!isSlowConnection && !isLowMemory);
    };

    checkPerformance();
    window.addEventListener('connectionchange', checkPerformance);
    
    return () => {
      window.removeEventListener('connectionchange', checkPerformance);
    };
  }, []);

  return { isOptimized };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderCount = React.useRef(0);
  
  React.useEffect(() => {
    renderCount.current++;
    
    // Log render frequency in development
    if (process.env.NODE_ENV === 'development' && renderCount.current > 100) {
      console.warn(`⚠️ High render frequency detected for ${componentName}: ${renderCount.current} renders`);
    }
  });

  const trackRender = React.useCallback((renderFn) => {
    return performanceUtils.measureRender(componentName, renderFn);
  }, [componentName]);

  return { trackRender };
};
