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
  
  // Try multiple parsing strategies
  
  // Strategy 1: Split by [BOOK X] markers
  const sections = text.split(/\[BOOK\s*\d+\]/i).filter(Boolean);
  
  if (sections.length > 0) {
    sections.forEach((section, index) => {
      if (index >= books.length) return;
      
      const book = books[index];
      const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
      
      // Extract description - be more flexible with the regex
      const descMatch = section.match(/Description:\s*(.+?)(?=\n\n|\[BOOK|$)/is);
      if (descMatch) {
        results[key] = descMatch[1].trim();
      }
    });
  }
  
  // Strategy 2: If strategy 1 didn't work well, try matching by book title
  if (Object.keys(results).length < books.length) {
    books.forEach(book => {
      const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
      if (results[key]) return; // Already found
      
      // Look for the book title in the response followed by description
      const titleEscaped = book.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titlePattern = new RegExp(`["']?${titleEscaped}["']?[^:]*:?\\s*(?:Description:)?\\s*(.+?)(?=\\n\\n|\\d+\\.|$)`, 'is');
      const match = text.match(titlePattern);
      if (match && match[1]) {
        const desc = match[1].trim();
        // Only use if it looks like a description (not just the title/author)
        if (desc.length > 20 && !desc.toLowerCase().includes('description:')) {
          results[key] = desc;
        }
      }
    });
  }
  
  // Strategy 3: Split by numbered list (1., 2., etc.)
  if (Object.keys(results).length < books.length) {
    const numberedSections = text.split(/\n\d+\.\s+/).filter(Boolean);
    numberedSections.forEach((section, index) => {
      if (index >= books.length) return;
      
      const book = books[index];
      const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
      if (results[key]) return; // Already found
      
      // Look for description after the title mention
      const descMatch = section.match(/(?:Description:)?\s*([A-Z][^]*?)$/is);
      if (descMatch && descMatch[1]) {
        const desc = descMatch[1].trim();
        if (desc.length > 20) {
          results[key] = desc.split('\n')[0].trim(); // Take first paragraph
        }
      }
    });
  }
  
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
