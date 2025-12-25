import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the image from the request
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Parse multipart form data
    const formData = await parseMultipartForm(req);
    const imageBuffer = formData.image;

    if (!imageBuffer) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mediaType = getMediaType(formData.imageType || 'image/jpeg');

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
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

// Helper function to parse multipart form data
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let imageBuffer = null;
    let imageType = 'image/jpeg';

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const boundary = getBoundary(req.headers['content-type']);
        
        if (!boundary) {
          return reject(new Error('No boundary found'));
        }

        const parts = buffer.toString('binary').split(boundary);
        
        for (const part of parts) {
          if (part.includes('Content-Disposition: form-data; name="image"')) {
            // Extract content type
            const contentTypeMatch = part.match(/Content-Type: (image\/[a-z]+)/i);
            if (contentTypeMatch) {
              imageType = contentTypeMatch[1];
            }

            // Find the start of the image data (after double CRLF)
            const dataStart = part.indexOf('\r\n\r\n') + 4;
            const dataEnd = part.lastIndexOf('\r\n');
            
            if (dataStart > 3 && dataEnd > dataStart) {
              const imageData = part.substring(dataStart, dataEnd);
              imageBuffer = Buffer.from(imageData, 'binary');
            }
          }
        }

        resolve({ image: imageBuffer, imageType });
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(.+)$/);
  return match ? '--' + match[1] : null;
}

function getMediaType(type) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(type) ? type : 'image/jpeg';
}
