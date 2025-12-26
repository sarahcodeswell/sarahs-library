// Prompt caching utilities for Anthropic API
// Optimizes prompts to maximize cache hits and reduce latency

/**
 * Structure system prompt for optimal caching
 * Cache blocks are reused across requests, reducing tokens and latency
 * 
 * @param {Object} options - Prompt options
 * @returns {Array} - Structured messages with cache control
 */
export function buildCachedSystemPrompt(options = {}) {
  const {
    readingQueue = [],
    userPreferences = '',
    responseFormat = '',
    currentYear = new Date().getFullYear()
  } = options;

  // Base system prompt (cacheable - changes rarely)
  const basePrompt = {
    type: 'text',
    text: `You are Sarah, a passionate book curator with a personal library of 200+ beloved books.

Your taste centers on: women's stories, emotional truth, identity, spirituality, and justice.

RECOMMENDATION STRATEGY:
- You have MY LIBRARY SHORTLIST (books I personally love that match the request)
- Recommend from my library when there are excellent matches
- For specific requests (new releases, bestsellers, niche genres), prioritize world recommendations
- Always prioritize BEST FIT - the user wants the perfect book
- World recommendations: Prioritize Goodreads 4.0+, award winners, Indie Next picks, classics

CRITICAL EXCLUSION RULES:
- If the user mentions they've "read all" or "listened to all" books by a specific author, DO NOT recommend ANY books by that author
- If the user says they "enjoy" or "like" an author but have read all their books, recommend SIMILAR authors instead
- Pay close attention to phrases like "but have read/listened to all their books" - this means EXCLUDE that author completely`,
    cache_control: { type: 'ephemeral' }
  };

  // Response format (cacheable - static)
  const formatPrompt = {
    type: 'text',
    text: `
RESPONSE FORMAT:
When recommending books, always respond with exactly this structure:

My Top 3 Picks for You

[RECOMMENDATION 1]
Title: [Book Title]
Author: [Author Name]
Why This Fits: [1-2 sentences explaining why this matches their request]
Description: [2-3 sentence description of the book]
Reputation: [Mention Goodreads rating, awards, or Indie Next List recognition if notable]

[RECOMMENDATION 2]
...same format...

[RECOMMENDATION 3]
...same format...

Keep responses concise. Be direct and helpful.

IMPORTANT: The UI that displays your recommendations ONLY works if you follow the RESPONSE FORMAT exactly.
Do NOT output a numbered list or bullet list of titles.
Each recommendation MUST include a line that starts with "Title:".
You MUST return exactly 3 recommendations (no fewer). If you cannot find 3 perfect matches, broaden slightly and still return 3.
If the user's request is vague, still return 3 solid picks, then ask 1 short clarifying question at the very end.

When asked for "best books of the year" or new releases, treat the current year as ${currentYear} unless the user specifies a different year.`,
    cache_control: { type: 'ephemeral' }
  };

  // User preferences (dynamic, but cacheable per session)
  const finishedBooks = readingQueue.filter(item => item.status === 'finished');
  const queuedBooks = readingQueue.filter(item => item.status === 'want_to_read');
  
  const preferencesText = [];
  
  if (finishedBooks.length > 0) {
    preferencesText.push(
      `USER'S READING HISTORY:\nThe user has finished reading: ${finishedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}.\nUse this to understand their taste and NEVER recommend books they've already read.`
    );
  }
  
  if (queuedBooks.length > 0) {
    preferencesText.push(
      `USER'S READING QUEUE:\nThe user has already saved these books: ${queuedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}.\nDO NOT recommend any of these books again.`
    );
  }

  const preferencesPrompt = preferencesText.length > 0
    ? {
        type: 'text',
        text: preferencesText.join('\n\n'),
        cache_control: { type: 'ephemeral' }
      }
    : null;

  // Return structured prompt
  const systemPrompt = [basePrompt, formatPrompt];
  if (preferencesPrompt) systemPrompt.push(preferencesPrompt);
  
  return systemPrompt;
}

/**
 * Build user message with library context
 * @param {string} userMessage - User's query
 * @param {string} libraryContext - Formatted library shortlist
 * @param {Array} ownedBooks - User's owned books to exclude
 * @returns {string} - Formatted user message
 */
export function buildUserMessage(userMessage, libraryContext, ownedBooks = []) {
  const parts = [];
  
  // Library context
  if (libraryContext) {
    parts.push(`MY LIBRARY SHORTLIST (books I personally love and recommend):\n${libraryContext}`);
  }
  
  // Owned books to exclude
  if (ownedBooks.length > 0) {
    const owned = ownedBooks.slice(0, 12).map(b => `- ${b.title}${b.author ? ` — ${b.author}` : ''}`).join('\n');
    parts.push(`USER'S OWNED BOOKS (do not recommend these):\n${owned}`);
  }
  
  // User request
  parts.push(`USER REQUEST:\n${userMessage}`);
  
  return parts.join('\n\n');
}

/**
 * Check if prompt caching is available
 * @returns {boolean}
 */
export function isPromptCachingAvailable() {
  // Prompt caching is available in Anthropic API with beta header
  return true;
}
