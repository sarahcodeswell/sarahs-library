// Clean recommendation service - single source of truth
// Handles all recommendation logic with clear separation of concerns

import { db } from './supabase';
import { findSimilarBooks, getBooksByThemes } from './vectorSearch';

/**
 * Build system prompt for Claude
 * Clean, focused, no library references
 */
function buildSystemPrompt() {
  return [
    {
      type: 'text',
      text: `You are Sarah, a passionate book curator helping readers discover their next great book.

Your taste centers on: women's stories, emotional truth, identity, spirituality, and justice.

RECOMMENDATION STRATEGY:
- Search the entire world of books to find the BEST matches for the user's request
- Prioritize highly-rated books (Goodreads 4.0+), award winners, Indie Next picks, and acclaimed titles
- Consider recent releases, classics, and hidden gems
- Always prioritize BEST FIT - the user wants the perfect book for their specific request

CRITICAL EXCLUSION RULE:
You will receive a list of books the user has already read, saved, or dismissed.
NEVER recommend ANY book from that exclusion list under ANY circumstances.
If a user asks about a book on the exclusion list, acknowledge they know it but do NOT include it in your 3 recommendations.

IMPORTANT:
When the user mentions authors they've already read (e.g., "I enjoy Jack Carr but have read all his books"), recommend books by DIFFERENT authors with similar styles.`,
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: `RESPONSE FORMAT:
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

When asked for "best books of the year" or new releases, treat the current year as ${new Date().getFullYear()} unless the user specifies a different year.`,
      cache_control: { type: 'ephemeral' }
    }
  ];
}

/**
 * Build user preferences from reading history
 */
function buildUserPreferences(readingQueue) {
  const finishedBooks = readingQueue.filter(item => item.status === 'finished');
  
  if (finishedBooks.length === 0) {
    return null;
  }

  // Categorize by rating
  const lovedBooks = finishedBooks.filter(b => b.rating === 5);
  const likedBooks = finishedBooks.filter(b => b.rating === 4);
  const lowRatedBooks = finishedBooks.filter(b => b.rating <= 2 && b.rating > 0);

  const parts = [];

  if (lovedBooks.length > 0) {
    parts.push(
      `⭐⭐⭐⭐⭐ BOOKS USER LOVED (5 stars - ${lovedBooks.length} books):\n${lovedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nThese are their absolute favorites. Recommend books with similar themes, writing styles, or by the same authors.`
    );
  }

  if (likedBooks.length > 0) {
    parts.push(
      `⭐⭐⭐⭐ BOOKS USER LIKED (4 stars - ${likedBooks.length} books):\n${likedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nThey enjoyed these books. Use as positive signals for recommendations.`
    );
  }

  if (lowRatedBooks.length > 0) {
    parts.push(
      `👎 BOOKS USER DISLIKED (1-2 stars - ${lowRatedBooks.length} books):\n${lowRatedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nAvoid recommending books with similar themes, styles, or genres to these.`
    );
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * Build exclusion list message
 */
function buildExclusionMessage(exclusionList) {
  if (!exclusionList || exclusionList.length === 0) {
    return null;
  }

  const displayCount = Math.min(exclusionList.length, 50);
  const exclusionText = exclusionList.slice(0, displayCount).join(', ');
  const remaining = exclusionList.length > displayCount ? ` (and ${exclusionList.length - displayCount} more)` : '';

  return `🚫 CRITICAL EXCLUSION LIST - DO NOT RECOMMEND ANY OF THESE BOOKS:\nUser has already read, saved, or dismissed these ${exclusionList.length} books:\n${exclusionText}${remaining}`;
}

/**
 * Get book recommendations from Claude
 * Single source of truth for recommendation logic
 */
export async function getRecommendations(userId, userMessage, readingQueue = [], themeFilters = []) {
  try {
    // 1. Fetch exclusion list (single fast query)
    let exclusionList = [];
    if (userId) {
      const { data: excludedTitles, error } = await db.getUserExclusionList(userId);
      if (!error && excludedTitles) {
        exclusionList = excludedTitles;
        console.log('[RecommendationService] Exclusion list loaded:', exclusionList.length, 'books');
      } else if (error) {
        console.error('[RecommendationService] Failed to load exclusion list:', error);
      }
    }

    // 2. Build system prompt (cached)
    const systemPrompt = buildSystemPrompt();

    // 3. Build user message
    const messageParts = [];

    // Add user preferences
    const preferences = buildUserPreferences(readingQueue);
    if (preferences) {
      messageParts.push(preferences);
    }

    // Add theme filter requirements (STRICT)
    if (themeFilters && themeFilters.length > 0) {
      const themeLabels = {
        women: "Women's stories",
        emotional: "Emotional truth",
        identity: "Identity & belonging",
        spiritual: "Spirituality & meaning",
        justice: "Justice & systems"
      };
      const selectedThemes = themeFilters.map(t => themeLabels[t] || t).join(', ');
      messageParts.push(`🎯 MANDATORY THEME REQUIREMENT:\nALL recommendations MUST match at least one of these themes: ${selectedThemes}\nDo NOT recommend books that don't fit these themes, even if they're excellent books.`);
    }

    // Add exclusion list
    const exclusionMessage = buildExclusionMessage(exclusionList);
    if (exclusionMessage) {
      messageParts.push(exclusionMessage);
    }

    // Add vector search context if available
    let vectorContext = '';
    try {
      if (themeFilters && themeFilters.length > 0) {
        // Get books by themes first
        const themeBooks = await getBooksByThemes(themeFilters, 10);
        if (themeBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED BOOKS THAT MATCH YOUR THEMES:\n${themeBooks.slice(0, 5).map((book, i) => 
            `${i + 1}. "${book.title}" by ${book.author || 'Unknown'}\n   Sarah's take: ${book.sarah_assessment || 'No assessment available'}`
          ).join('\n\n')}`;
        }
      } else {
        // Use semantic search for general queries
        const similarBooks = await findSimilarBooks(userMessage, 5, 0.6);
        if (similarBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED BOOKS SIMILAR TO YOUR REQUEST:\n${similarBooks.map((book, i) => 
            `${i + 1}. "${book.title}" by ${book.author || 'Unknown'} (similarity: ${book.similarity.toFixed(2)})\n   Sarah's take: ${book.sarah_assessment || 'No assessment available'}`
          ).join('\n\n')}`;
        }
      }
    } catch (error) {
      console.log('Vector search unavailable, using general recommendations');
    }

    // Add user request
    messageParts.push(`USER REQUEST:\n${userMessage}${vectorContext}`);

    const userContent = messageParts.join('\n\n');

    // 4. Call Claude API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 600,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userContent }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data?.content?.[0]?.text) {
        throw new Error('Invalid API response format');
      }

      return {
        success: true,
        text: data.content[0].text,
        exclusionCount: exclusionList.length,
        exclusionList: exclusionList // Return for client-side validation
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('[RecommendationService] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse Claude's response into structured recommendations
 */
export function parseRecommendations(responseText) {
  const recommendations = [];
  const lines = responseText.split('\n');
  let currentRec = null;

  for (const line of lines) {
    let trimmed = line.trim();
    
    // Skip [RECOMMENDATION X] markers
    if (trimmed.match(/^\[RECOMMENDATION\s*\d+\]$/i)) {
      continue;
    }
    
    // Remove inline [RECOMMENDATION X] markers from text
    trimmed = trimmed.replace(/\[RECOMMENDATION\s*\d+\]/gi, '').trim();
    
    if (trimmed.startsWith('Title:')) {
      if (currentRec) recommendations.push(currentRec);
      currentRec = { title: trimmed.substring(6).trim() };
    } else if (trimmed.startsWith('Author:') && currentRec) {
      currentRec.author = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('Why This Fits:') && currentRec) {
      currentRec.why = trimmed.substring(14).trim();
    } else if (trimmed.startsWith('Why:') && currentRec) {
      currentRec.why = trimmed.substring(4).trim();
    } else if (trimmed.startsWith('Description:') && currentRec) {
      currentRec.description = trimmed.substring(12).trim();
    } else if (trimmed.startsWith('Reputation:') && currentRec) {
      currentRec.reputation = trimmed.substring(11).trim();
    } else if (currentRec && currentRec.description && !trimmed.startsWith('Title:') && !trimmed.startsWith('Author:') && !trimmed.startsWith('Why') && !trimmed.startsWith('Reputation:') && trimmed.length > 0) {
      // Also clean any [RECOMMENDATION X] from continuation lines
      const cleanedLine = trimmed.replace(/\[RECOMMENDATION\s*\d+\]/gi, '').trim();
      if (cleanedLine) {
        currentRec.description += ' ' + cleanedLine;
      }
    }
  }

  if (currentRec) recommendations.push(currentRec);

  return recommendations;
}
