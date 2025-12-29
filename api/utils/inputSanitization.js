// Input sanitization to prevent prompt injection and abuse

/**
 * Sanitize user input to prevent prompt injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeUserInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Limit length to prevent abuse
  const maxLength = 2000;
  let sanitized = input.slice(0, maxLength);
  
  // Remove potential prompt injection patterns
  const dangerousPatterns = [
    /system:/gi,
    /assistant:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /ignore previous instructions/gi,
    /disregard all previous/gi,
    /forget everything/gi,
    /new instructions:/gi,
  ];
  
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Validate message array for chat API
 * @param {Array} messages - Array of message objects
 * @returns {Object} - { valid: boolean, error?: string, sanitized?: Array }
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  
  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }
  
  if (messages.length > 50) {
    return { valid: false, error: 'Too many messages in conversation' };
  }
  
  const sanitized = messages.map(msg => {
    if (!msg || typeof msg !== 'object') {
      return null;
    }
    
    // Validate message structure
    if (!msg.role || !msg.content) {
      return null;
    }
    
    // Only allow valid roles
    const validRoles = ['user', 'assistant'];
    if (!validRoles.includes(msg.role)) {
      return null;
    }
    
    // Sanitize content based on type
    let sanitizedContent;
    if (typeof msg.content === 'string') {
      sanitizedContent = sanitizeUserInput(msg.content);
    } else if (Array.isArray(msg.content)) {
      // Handle structured content (for system prompts with cache_control)
      sanitizedContent = msg.content.map(item => {
        if (item.type === 'text' && item.text) {
          return {
            ...item,
            text: sanitizeUserInput(item.text),
          };
        }
        return item;
      });
    } else {
      return null;
    }
    
    return {
      role: msg.role,
      content: sanitizedContent,
    };
  }).filter(msg => msg !== null);
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'No valid messages after sanitization' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate system prompt structure
 * @param {Array} systemPrompt - System prompt array
 * @returns {boolean}
 */
export function validateSystemPrompt(systemPrompt) {
  if (!Array.isArray(systemPrompt)) {
    return false;
  }
  
  // Check each item has required structure
  return systemPrompt.every(item => {
    return item && 
           typeof item === 'object' && 
           item.type === 'text' && 
           typeof item.text === 'string';
  });
}
