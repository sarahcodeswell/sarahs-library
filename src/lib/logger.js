// Production-safe logger utility
// Only logs in development mode unless explicitly forced

const isDev = typeof import.meta !== 'undefined' 
  ? import.meta.env?.DEV 
  : process.env.NODE_ENV !== 'production';

/**
 * Development-only console.log
 */
export function log(...args) {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * Development-only console.warn
 */
export function warn(...args) {
  if (isDev) {
    console.warn(...args);
  }
}

/**
 * Always logs errors (production + dev)
 */
export function error(...args) {
  console.error(...args);
}

/**
 * Development-only console.info
 */
export function info(...args) {
  if (isDev) {
    console.info(...args);
  }
}

/**
 * Development-only console.debug
 */
export function debug(...args) {
  if (isDev) {
    console.debug(...args);
  }
}

/**
 * Logs with a prefix tag for easier filtering
 */
export function tagged(tag, ...args) {
  if (isDev) {
    console.log(`[${tag}]`, ...args);
  }
}

/**
 * Force log even in production (use sparingly)
 */
export function forceLog(...args) {
  console.log(...args);
}

// Default export for convenience
export default {
  log,
  warn,
  error,
  info,
  debug,
  tagged,
  forceLog
};
