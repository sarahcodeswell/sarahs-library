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
    text: `You are Sarah, a passionate book curator helping readers discover their next great book.

Your taste centers on: women's stories, emotional truth, identity, spirituality, and justice.

RECOMMENDATION STRATEGY:
- Search the entire world of books to find the BEST matches for the user's request
- Prioritize Goodreads 4.0+ rated books, award winners, Indie Next picks, and acclaimed titles
- Consider recent releases, classics, and hidden gems
- Always prioritize BEST FIT - the user wants the perfect book for their specific request

CRITICAL: You will receive a list of books the user has already read, saved, or dismissed. NEVER recommend any book from that exclusion list under any circumstances.

IMPORTANT: When the user mentions authors they've already read (e.g., "I enjoy Jack Carr but have read all his books"), recommend books by DIFFERENT authors with similar styles. Do not recommend books by the mentioned authors.`,
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
  const queuedBooks = readingQueue.filter(item => 
    item.status === 'want_to_read' || item.status === 'reading'
  );
  
  const preferencesText = [];
  
  // Separate books by rating
  const highlyRatedBooks = finishedBooks.filter(b => b.rating >= 4);
  const lovedBooks = finishedBooks.filter(b => b.rating === 5);
  const likedBooks = finishedBooks.filter(b => b.rating === 4);
  const lowRatedBooks = finishedBooks.filter(b => b.rating && b.rating <= 2);
  const unratedBooks = finishedBooks.filter(b => !b.rating);
  
  // Books they LOVED (5 stars) - use for recommendations
  if (lovedBooks.length > 0) {
    preferencesText.push(
      `⭐⭐⭐⭐⭐ BOOKS USER LOVED (5 stars - ${lovedBooks.length} books):\n${lovedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nThese are their absolute favorites. Recommend books with similar themes, writing styles, or by the same authors.`
    );
  }
  
  // Books they LIKED (4 stars) - also good for recommendations
  if (likedBooks.length > 0) {
    preferencesText.push(
      `⭐⭐⭐⭐ BOOKS USER REALLY LIKED (4 stars - ${likedBooks.length} books):\n${likedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nThese are strong favorites. Consider similar books but prioritize 5-star matches first.`
    );
  }
  
  // Books they DISLIKED (1-2 stars) - avoid similar books
  if (lowRatedBooks.length > 0) {
    preferencesText.push(
      `👎 BOOKS USER DISLIKED (1-2 stars - ${lowRatedBooks.length} books):\n${lowRatedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nAvoid recommending books with similar themes, styles, or genres to these.`
    );
  }
  
  // All finished books (for exclusion)
  if (finishedBooks.length > 0) {
    preferencesText.push(
      `🚫 CRITICAL EXCLUSION - BOOKS USER HAS ALREADY READ (${finishedBooks.length} books):\n${finishedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\n⚠️ ABSOLUTE RULE: NEVER recommend ANY of these books under ANY circumstances. If a user asks about one of these books, acknowledge they've read it but do NOT include it in your 3 recommendations.`
    );
  }
  
  if (queuedBooks.length > 0) {
    preferencesText.push(
      `📚 BOOKS USER HAS ALREADY SAVED TO READING QUEUE (${queuedBooks.length} books):\n${queuedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\n⚠️ DO NOT recommend any of these books - they're already in the user's reading queue.`
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
