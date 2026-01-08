import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize Sentry in production
  if (import.meta.env.MODE !== 'production') {
    console.log('Sentry disabled in development mode');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    environment: import.meta.env.MODE,
    
    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Filter out AbortError from user cancellations
      if (error && error.name === 'AbortError') {
        return null;
      }
      
      // Filter out network errors that are user-initiated
      if (error && error.message && error.message.includes('Failed to fetch')) {
        return null;
      }
      
      return event;
    },
  });
}

// Custom error tracking for specific scenarios
export function captureError(error, context = {}) {
  if (import.meta.env.MODE === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, 'Context:', context);
  }
}

// Track custom events
export function captureMessage(message, level = 'info', context = {}) {
  if (import.meta.env.MODE === 'production') {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`[${level}]`, message, context);
  }
}

// Set user context for better error tracking
export function setUserContext(user) {
  if (import.meta.env.MODE === 'production' && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  }
}

// Clear user context on logout
export function clearUserContext() {
  if (import.meta.env.MODE === 'production') {
    Sentry.setUser(null);
  }
}

// ============================================
// RECOMMENDATION MONITORING
// ============================================

/**
 * Alert when catalog returns 0 books for a theme filter
 * This indicates a data gap that needs attention
 */
export function alertCatalogEmpty(theme, query) {
  captureMessage('Catalog returned 0 books for theme', 'warning', {
    theme,
    query,
    action_needed: 'Add books with this theme tag to the database',
  });
}

/**
 * Alert when system falls back to Claude due to empty catalog
 * This is a potential hallucination risk
 */
export function alertClaudeFallback(reason, query, catalogBooksCount) {
  captureMessage('Recommendation fell back to Claude', 'warning', {
    reason,
    query,
    catalogBooksCount,
    risk: 'Potential hallucination if Claude generates non-existent books',
  });
}

/**
 * Alert when book enrichment fails (book title not found)
 * Strong indicator of hallucination
 */
export function alertBookEnrichmentFailed(title, author, query) {
  captureMessage('Book enrichment failed - possible hallucination', 'error', {
    title,
    author,
    query,
    action_needed: 'Verify if this book exists or if Claude hallucinated',
  });
}

/**
 * Alert when a theme has fewer than minimum books
 * Proactive warning before it becomes a problem
 */
export function alertThemeCoverageGap(theme, bookCount, minimumRequired = 3) {
  if (bookCount < minimumRequired) {
    captureMessage('Theme has insufficient book coverage', 'warning', {
      theme,
      bookCount,
      minimumRequired,
      action_needed: `Add at least ${minimumRequired - bookCount} more books with '${theme}' theme`,
    });
  }
}
