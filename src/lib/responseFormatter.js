/**
 * Response Formatter - Uses Claude Tool Use to format recommendations
 * 
 * This module takes verified book data and formats it into natural language.
 * Claude MUST use only the provided books - it cannot add or invent books.
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

const FORMAT_RECOMMENDATIONS_TOOL = {
  name: "format_recommendations",
  description: "Format verified book data into a natural language recommendation response. You MUST use ONLY the books provided in the context - do not add any books not in the list.",
  input_schema: {
    type: "object",
    properties: {
      intro_text: {
        type: "string",
        description: "Brief intro (1-2 sentences) acknowledging the user's request and setting up the recommendations"
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            why_fits: { 
              type: "string", 
              description: "1-2 sentences explaining why this book matches the request" 
            },
            source: { 
              type: "string",
              enum: ["catalog", "web_search"],
              description: "Where this book came from - catalog for Sarah's collection, web_search for external"
            },
            reputation: {
              type: "string",
              description: "Notable accolades, awards, or recognition (e.g., 'NYT Bestseller', 'Pulitzer Prize', 'Goodreads Choice Award', 'Indie Next List'). Leave empty if none known."
            }
          },
          required: ["title", "author", "why_fits", "source"]
        },
        description: "Book recommendations - use ONLY books from the provided list"
      }
    },
    required: ["intro_text", "recommendations"]
  }
};

const FORMATTING_SYSTEM_PROMPT = `You are a response formatter for Sarah's Books recommendation system. Your ONLY job is to format pre-selected book recommendations into natural, friendly language.

CRITICAL RULES:
1. You MUST use ONLY the books provided in the AVAILABLE_BOOKS list
2. You CANNOT add, suggest, or mention any books not in AVAILABLE_BOOKS
3. You CANNOT make up book titles or authors
4. Each recommendation must include why it fits the user's request
5. Keep the intro brief and warm - this is Sarah speaking to her readers

If AVAILABLE_BOOKS is empty, acknowledge you couldn't find matches and suggest browsing curated lists.

You MUST call the format_recommendations tool with your formatted response.`;

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, maxRetries = 2, baseDelay = 500) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[ResponseFormatter] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Format verified book data into a recommendation response
 * 
 * @param {string} userQuery - Original user query
 * @param {Array} verifiedBooks - Array of verified book objects from catalog/search
 * @param {Object} context - Additional context (intent, themes, etc.)
 * @returns {Promise<Object>} Formatted response
 */
export async function formatRecommendations(userQuery, verifiedBooks, context = {}) {
  if (!verifiedBooks || verifiedBooks.length === 0) {
    return getEmptyResponse(userQuery, context);
  }

  // Build the available books context
  const booksContext = verifiedBooks.slice(0, 5).map((book, i) => {
    let context = `${i + 1}. "${book.title}" by ${book.author}
   Description: ${book.description || book.sarah_assessment || 'A quality read.'}
   Source: ${book.source || 'catalog'}`;
    if (book.reputation) {
      context += `\n   Reputation: ${book.reputation}`;
    }
    return context;
  }).join('\n\n');

  const userMessage = `USER REQUEST: "${userQuery}"

AVAILABLE_BOOKS (you MUST only recommend from this list):
${booksContext}

Format these books as recommendations, explaining why each fits the user's request.`;

  try {
    const response = await withRetry(async () => {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1000,
          temperature: 0,
          system: FORMATTING_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: userMessage }
          ],
          tools: [FORMAT_RECOMMENDATIONS_TOOL],
          tool_choice: { type: 'tool', name: 'format_recommendations' }
        })
      });
      
      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }
      return resp;
    });

    if (!response.ok) {
      console.error('[ResponseFormatter] API error:', response.status);
      return getFallbackFormat(verifiedBooks, context);
    }

    const data = await response.json();
    
    const toolUse = data.content?.find(block => block.type === 'tool_use');
    if (!toolUse || toolUse.name !== 'format_recommendations') {
      console.warn('[ResponseFormatter] No tool use in response');
      return getFallbackFormat(verifiedBooks, context);
    }

    const formatted = toolUse.input;
    
    // Validate that recommendations only include provided books
    const validatedRecs = validateRecommendationsAgainstSource(
      formatted.recommendations || [],
      verifiedBooks
    );

    return {
      intro_text: formatted.intro_text || '',
      recommendations: validatedRecs,
      formatting_success: true
    };

  } catch (error) {
    console.error('[ResponseFormatter] Formatting failed:', error);
    return getFallbackFormat(verifiedBooks, context);
  }
}

/**
 * Validate that formatted recommendations only include books from source
 */
function validateRecommendationsAgainstSource(recommendations, sourceBooks) {
  const sourceTitles = new Set(
    sourceBooks.map(b => b.title?.toLowerCase().trim())
  );

  return recommendations.filter(rec => {
    const recTitle = rec.title?.toLowerCase().trim();
    if (!sourceTitles.has(recTitle)) {
      console.warn(`[ResponseFormatter] Filtered out non-source book: ${rec.title}`);
      return false;
    }
    return true;
  });
}

/**
 * Fallback formatting when Claude tool use fails
 */
function getFallbackFormat(verifiedBooks, context) {
  const recommendations = verifiedBooks.slice(0, 3).map(book => ({
    title: book.title,
    author: book.author,
    why_fits: book.sarah_assessment || book.description || 'A wonderful read from my collection.',
    source: book.source || 'catalog'
  }));

  return {
    intro_text: 'Here are some recommendations from my collection:',
    recommendations,
    formatting_success: false
  };
}

/**
 * Response when no books are found
 */
function getEmptyResponse(userQuery, context) {
  return {
    intro_text: "I couldn't find specific matches for that request in my collection. Try browsing one of my curated lists like Women's Stories or Emotional Truth, or ask me about a specific theme or mood.",
    recommendations: [],
    formatting_success: true,
    empty: true
  };
}

/**
 * Convert formatted response to the text format expected by the UI
 */
export function formatToText(formattedResponse) {
  if (!formattedResponse || formattedResponse.empty) {
    return formattedResponse.intro_text || "I couldn't find matches for that request.";
  }

  let text = formattedResponse.intro_text + '\n\n';
  
  for (const rec of formattedResponse.recommendations) {
    text += `Title: ${rec.title}\n`;
    text += `Author: ${rec.author}\n`;
    text += `Why This Fits: ${rec.why_fits}\n`;
    if (rec.reputation) {
      text += `Reputation: ${rec.reputation}\n`;
    }
    text += '\n';
  }

  return text.trim();
}

export { FORMAT_RECOMMENDATIONS_TOOL, FORMATTING_SYSTEM_PROMPT };
