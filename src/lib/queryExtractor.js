/**
 * Query Extractor - Uses Claude Tool Use to extract structured search parameters
 * 
 * This module is responsible for translating natural language queries into
 * structured search parameters. Claude acts as a "translator" only - it does
 * not make routing decisions or suggest books.
 * 
 * @see docs/RECOMMENDATION_ARCHITECTURE_V2.md
 */

const EXTRACT_SEARCH_INTENT_TOOL = {
  name: "extract_search_intent",
  description: "Extract structured search parameters from a book recommendation query. Only extract entities explicitly mentioned - do not infer or guess.",
  input_schema: {
    type: "object",
    properties: {
      search_query: {
        type: "string",
        description: "Optimized query for semantic search. Remove filler words like 'I want', 'can you', 'please'. Keep meaningful terms about books, themes, moods, or genres."
      },
      author_mentioned: {
        type: ["string", "null"],
        description: "Author name if EXPLICITLY mentioned in query. Must be null if no author is mentioned."
      },
      book_mentioned: {
        type: ["string", "null"],
        description: "Book title if EXPLICITLY mentioned in query. Must be null if no book title is mentioned."
      },
      intent: {
        type: "string",
        enum: ["similar_author", "similar_book", "theme_search", "mood_search", "new_releases", "browse"],
        description: "Primary intent: similar_author (user mentions an author and wants similar), similar_book (user mentions a book and wants similar), theme_search (topic-based like 'mystery' or 'historical fiction'), mood_search (feeling-based like 'uplifting' or 'emotional'), new_releases (recent/new/latest books), browse (general exploration or vague request)"
      },
      themes: {
        type: "array",
        items: { type: "string" },
        description: "Relevant themes extracted from query. Use only: women, emotional, identity, justice, spiritual, family, belonging, resilience, historical, contemporary, mystery, thriller, literary, memoir"
      }
    },
    required: ["search_query", "intent"]
  }
};

const EXTRACTION_SYSTEM_PROMPT = `You are a query parser for a book recommendation system. Your ONLY job is to extract structured search parameters from user queries.

RULES:
1. Extract ONLY what is explicitly mentioned - do not infer or guess
2. If no author is mentioned, author_mentioned MUST be null
3. If no book title is mentioned, book_mentioned MUST be null
4. The search_query should be optimized for semantic search - remove filler words
5. Choose the most specific intent that matches the query

EXAMPLES:
- "I like reading Kristin Hannah" → author_mentioned: "Kristin Hannah", intent: "similar_author"
- "Books like The Nightingale" → book_mentioned: "The Nightingale", intent: "similar_book"
- "I want something emotional and powerful" → intent: "mood_search", themes: ["emotional"]
- "Mystery books" → intent: "theme_search", themes: ["mystery"]
- "What's new from Paula McLain" → author_mentioned: "Paula McLain", intent: "new_releases"
- "Show me what you have" → intent: "browse"

You MUST call the extract_search_intent tool with your extraction.`;

/**
 * Extract structured search parameters from a user query using Claude tool use
 * 
 * @param {string} userQuery - The raw user query
 * @returns {Promise<Object>} Extracted parameters
 */
export async function extractSearchIntent(userQuery) {
  if (!userQuery || typeof userQuery !== 'string') {
    return getFallbackExtraction(userQuery);
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0, // Deterministic output
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userQuery }
        ],
        tools: [EXTRACT_SEARCH_INTENT_TOOL],
        tool_choice: { type: 'tool', name: 'extract_search_intent' }
      })
    });

    if (!response.ok) {
      console.error('[QueryExtractor] API error:', response.status);
      return getFallbackExtraction(userQuery);
    }

    const data = await response.json();
    
    // Extract tool use result
    const toolUse = data.content?.find(block => block.type === 'tool_use');
    if (!toolUse || toolUse.name !== 'extract_search_intent') {
      console.warn('[QueryExtractor] No tool use in response');
      return getFallbackExtraction(userQuery);
    }

    const extraction = toolUse.input;
    
    // Ensure required fields
    if (!extraction.search_query || !extraction.intent) {
      console.warn('[QueryExtractor] Missing required fields');
      return getFallbackExtraction(userQuery);
    }

    // Normalize the extraction
    return {
      search_query: extraction.search_query,
      author_mentioned: extraction.author_mentioned || null,
      book_mentioned: extraction.book_mentioned || null,
      intent: extraction.intent,
      themes: Array.isArray(extraction.themes) ? extraction.themes : [],
      raw_query: userQuery,
      extraction_success: true
    };

  } catch (error) {
    console.error('[QueryExtractor] Extraction failed:', error);
    return getFallbackExtraction(userQuery);
  }
}

/**
 * Fallback extraction when Claude tool use fails
 * Uses the original query with default intent
 */
function getFallbackExtraction(userQuery) {
  return {
    search_query: String(userQuery || '').trim(),
    author_mentioned: null,
    book_mentioned: null,
    intent: 'theme_search',
    themes: [],
    raw_query: userQuery,
    extraction_success: false
  };
}

export { EXTRACT_SEARCH_INTENT_TOOL, EXTRACTION_SYSTEM_PROMPT };
