import Anthropic from '@anthropic-ai/sdk';
import { getClientIdentifier } from './utils/auth.js';
import { checkDailyLimit } from './utils/userLimits.js';
import { rateLimit } from './utils/rateLimit.js';
import { trackCost } from './utils/costMonitoring.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(req);
    
    // Rate limiting: 10 requests per minute
    const rateLimitResult = rateLimit(clientId, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    
    if (!rateLimitResult.isAllowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        resetIn: rateLimitResult.resetIn
      });
    }
    
    // Daily limit: 20 photo recognitions per day
    const dailyLimit = checkDailyLimit(clientId, 'photo_recognition');
    
    if (!dailyLimit.allowed) {
      const resetDate = new Date(dailyLimit.resetTime);
      return res.status(429).json({
        error: `Daily limit reached. You've used all ${dailyLimit.limit} photo recognitions for today. Resets at midnight.`,
        resetTime: resetDate.toISOString(),
        remaining: 0
      });
    }

    // Expect JSON body with base64 encoded image
    const { image, mediaType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Validate image size (limit to 5MB base64)
    if (image.length > 5 * 1024 * 1024 * 1.37) { // base64 is ~1.37x larger
      return res.status(400).json({ error: 'Image too large. Maximum 5MB.' });
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const imageMediaType = mediaType || 'image/jpeg';

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this image and identify any books visible. For each book you can see, extract:
- Title (required)
- Author (if visible)
- ISBN (if visible on barcode or cover)

Return ONLY a JSON array of books in this exact format:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "isbn": "ISBN if visible",
    "confidence": 0.95
  }
]

If you cannot clearly read a book title, do not include it. Only include books where you can confidently read the title. If no books are visible or readable, return an empty array: []

Do not include any other text, explanations, or markdown formatting. Only return the JSON array.`
            }
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].text.trim();
    
    // Try to extract JSON from the response
    let books = [];
    try {
      // Remove markdown code blocks if present
      const jsonText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      books = JSON.parse(jsonText);
      
      if (!Array.isArray(books)) {
        books = [];
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse book data',
        books: []
      });
    }

    // Track successful API call cost
    trackCost('photo_recognition');

    // Return recognized books
    return res.status(200).json({
      success: true,
      books: books,
      count: books.length
    });

  } catch (error) {
    console.error('Book recognition error:', error);
    return res.status(500).json({ 
      error: 'Failed to process image',
      message: error.message 
    });
  }
}
