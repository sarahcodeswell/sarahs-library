// Book description generation service
// Generates brief descriptions for books using Claude API

/**
 * Generate descriptions for a batch of books
 * @param {Array} books - Array of {title, author} objects
 * @returns {Promise<Object>} - Map of "title|author" -> description
 */
export async function generateBookDescriptions(books) {
  if (!books || books.length === 0) {
    return {};
  }

  // Batch books into groups of 10 to avoid token limits
  const batchSize = 10;
  const results = {};

  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    
    try {
      const batchResults = await generateDescriptionBatch(batch);
      Object.assign(results, batchResults);
    } catch (error) {
      console.error(`Error generating descriptions for batch ${i / batchSize + 1}:`, error);
      // Continue with next batch even if one fails
    }
  }

  return results;
}

/**
 * Generate descriptions for a single batch of books
 */
async function generateDescriptionBatch(books) {
  const bookList = books.map((b, i) => `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}`).join('\n');

  const systemPrompt = `You are a helpful book description writer. Generate brief, engaging descriptions for books.

RESPONSE FORMAT:
For each book, respond with exactly this format:
[BOOK 1]
Description: [2-3 sentence description of the book's plot/themes without spoilers]

[BOOK 2]
Description: [2-3 sentence description]

...and so on for each book.

Keep descriptions concise (2-3 sentences max), engaging, and spoiler-free.
Focus on the book's themes, setting, and what makes it compelling.
If you don't know a book, write a brief generic description based on the title and author's typical style.`;

  const userMessage = `Please generate brief descriptions for these books:\n\n${bookList}`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        system: [{ type: 'text', text: systemPrompt }],
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    // Parse the response
    return parseDescriptionResponse(text, books);
  } catch (error) {
    console.error('Error calling description API:', error);
    return {};
  }
}

/**
 * Parse Claude's response into a map of book -> description
 */
function parseDescriptionResponse(text, books) {
  const results = {};
  
  // Split by [BOOK X] markers
  const sections = text.split(/\[BOOK\s*\d+\]/i).filter(Boolean);
  
  sections.forEach((section, index) => {
    if (index >= books.length) return;
    
    const book = books[index];
    const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
    
    // Extract description
    const descMatch = section.match(/Description:\s*(.+?)(?=\n\n|\[BOOK|$)/is);
    if (descMatch) {
      results[key] = descMatch[1].trim();
    }
  });

  return results;
}

/**
 * Generate description for a single book
 */
export async function generateSingleDescription(title, author) {
  const results = await generateBookDescriptions([{ title, author }]);
  const key = `${title.toLowerCase()}|${(author || '').toLowerCase()}`;
  return results[key] || null;
}
