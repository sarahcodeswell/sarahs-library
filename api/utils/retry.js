// Retry utility with exponential backoff for external API calls
// Critical for reliability when Anthropic, OpenAI, or Serper have transient failures

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryOn = (error) => true, // Function to determine if error is retryable
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we've exhausted attempts or error is not retryable
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable (transient failures)
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether to retry
 */
export function isRetryableError(error) {
  // Retry on network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  // Retry on timeout
  if (error.name === 'AbortError') {
    return true;
  }
  
  // Retry on specific HTTP status codes
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];
  
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }
  
  // Don't retry on client errors (4xx except 408, 429)
  if (error.status && error.status >= 400 && error.status < 500) {
    return false;
  }
  
  return true; // Default to retrying unknown errors
}

/**
 * Fetch with retry and timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options (includes timeout, throwOnError)
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} - Fetch response
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const { timeout = 15000, throwOnError = false, ...fetchOptions } = options;
  
  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      // Only retry on 5xx errors (server errors)
      // Don't retry on 4xx (client errors) - those won't change
      if (!response.ok && response.status >= 500) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }
      
      // For 4xx errors, return the response so caller can handle it
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    ...retryOptions,
    retryOn: isRetryableError,
  });
}
