// API endpoint for chat with rate limiting
import { createRateLimitMiddleware } from '../../lib/rateLimiter.js';

// Import the existing chat handler logic
const chatHandler = async (req, res) => {
  // Your existing chat logic here
  res.status(200).json({ message: 'Chat endpoint with rate limiting' });
};

// Apply rate limiting middleware
const rateLimitedChat = createRateLimitMiddleware('chat');

export default function handler(req, res) {
  return rateLimitedChat(req, res, () => chatHandler(req, res));
}
