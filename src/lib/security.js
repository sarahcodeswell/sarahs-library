// Security utilities and middleware

// Content Security Policy headers
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://vercel.app https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.anthropic.com https://api.openai.com https://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Input sanitization
export const sanitizeInput = {
  // Remove HTML tags and scripts
  stripHtml: (text) => {
    if (typeof text !== 'string') return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  // Sanitize user messages
  sanitizeMessage: (message) => {
    if (typeof message !== 'string') return '';
    
    return message
      .trim()
      .slice(0, 1000) // Limit length
      .replace(/[<>]/g, '') // Remove potential XSS
      .replace(/javascript:/gi, '') // Remove JS protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:/gi, ''); // Remove data URLs
  },

  // Validate email addresses
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate URLs
  validateUrl: (url) => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
};

// Rate limiting utilities
export const rateLimitUtils = {
  // Generate user fingerprint
  generateFingerprint: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    const timestamp = Date.now();
    
    // Simple hash using btoa (browser-compatible)
    return btoa(`${ip}:${userAgent}:${timestamp}`).slice(0, 32);
  },

  // Check for suspicious patterns
  isSuspiciousRequest: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /node/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  },

  // Block suspicious IPs (simple implementation)
  blockedIPs: new Set(), // In production, use Redis or database
  
  isIPBlocked: (ip) => {
    return rateLimitUtils.blockedIPs.has(ip);
  },

  blockIP: (ip, duration = 3600000) => { // 1 hour default
    rateLimitUtils.blockedIPs.add(ip);
    setTimeout(() => {
      rateLimitUtils.blockedIPs.delete(ip);
    }, duration);
  }
};

// Authentication security
export const authSecurity = {
  // Generate secure session token
  generateSessionToken: () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Validate session token
  validateSessionToken: (token) => {
    return typeof token === 'string' && 
           token.length === 64 && 
           /^[a-f0-9]+$/i.test(token);
  },

  // Hash passwords (client-side only for demo - use server-side in production)
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  // Secure password requirements
  validatePassword: (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(requirements).every(Boolean);
    const missing = Object.entries(requirements)
      .filter(([key, value]) => !value)
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase());
    
    return { isValid, missing };
  }
};

// API security middleware
export const createSecurityMiddleware = () => {
  return (req, res, next) => {
    // Apply security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.set(header, value);
    });

    // Check for blocked IPs
    const clientIP = req.ip || req.connection.remoteAddress;
    if (rateLimitUtils.isIPBlocked(clientIP)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for suspicious requests
    if (rateLimitUtils.isSuspiciousRequest(req)) {
      console.warn('Suspicious request detected:', {
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        path: req.path
      });
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      return res.status(413).json({ error: 'Request too large' });
    }

    next();
  };
};

// Error handling for security
export class SecurityError extends Error {
  constructor(message, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

// Security audit logging
export const securityLogger = {
  log: (event, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...details
    };
    
    console.log('[SECURITY]', logEntry);
    
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      // Send to security monitoring service
    }
  },

  logSuspiciousActivity: (req, reason) => {
    securityLogger.log('SUSPICIOUS_ACTIVITY', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      reason
    });
  },

  logSecurityEvent: (event, userId, details = {}) => {
    securityLogger.log(event, {
      userId,
      ...details
    });
  }
};
