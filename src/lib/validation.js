// Input validation schemas and utilities
import { z } from 'zod';

// Book validation schema
export const bookSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  author: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
});

// Reading queue item validation
export const queueItemSchema = z.object({
  book_title: z.string().min(1).max(200).trim(),
  book_author: z.string().max(100).trim().optional(),
  status: z.enum(['want_to_read', 'reading', 'finished']),
});

// User message validation
export const messageSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
  themes: z.array(z.string()).max(5).optional(),
});

// Validation helper functions
export function validateBook(data) {
  try {
    return bookSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid book data: ${error.message}`);
  }
}

export function validateQueueItem(data) {
  try {
    return queueItemSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid queue item: ${error.message}`);
  }
}

export function validateMessage(data) {
  try {
    return messageSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid message: ${error.message}`);
  }
}

// Sanitize text input
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS
    .replace(/javascript:/gi, '') // Remove JS protocols
    .slice(0, 1000); // Limit length
}

// Validate file uploads
export function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  return true;
}
