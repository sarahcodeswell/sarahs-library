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
