// Clean recommendation service - single source of truth
// Handles all recommendation logic with clear separation of concerns

import { db } from './supabase';
import { findSimilarBooks, getBooksByThemes, findSimilarBooksAcrossUsers, getPopularBooks, findBooksByAuthor, findBooksByGenre, findCatalogBooksByAuthor, findCatalogBooksByGenre } from './vectorSearch';

/**
 * Detect search intent from user message
 * Returns { type: 'author'|'genre'|'theme'|'general', value: string }
 */
function detectSearchIntent(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Author patterns - order matters, more specific first
  const authorPatterns = [
    // "the new Paula McLain book", "the latest Kristin Hannah book"
    /(?:the\s+)?(?:new|latest|newest|recent)\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)\s+book/i,
    // "a Paula McLain book", "any Paula McLain book"
    /(?:a|any|another)\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)\s+book/i,
    // "Paula McLain's new book", "Paula McLain's latest"
    /([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)(?:'s|s)\s+(?:new|latest|newest|book)/i,
    // "books by Paula McLain"
    /books?\s+(?:by|from)\s+(.+)/i,
    // "more by Paula McLain"
    /more\s+(?:by|from)\s+(.+)/i,
    // "author Paula McLain"
    /(?:author|writer)\s+(.+)/i,
    // "Paula McLain books"
    /([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)\s+books?/i,
    // "recommend something by Paula McLain"
    /recommend.+(?:by|from)\s+(.+)/i,
    // "anything by Paula McLain"
    /anything\s+(?:by|from)\s+(.+)/i,
    // "read Paula McLain" or "read the Paula McLain"
    /read\s+(?:the\s+)?(?:new\s+)?([A-Z][a-z]+\s+[A-Z][a-zA-Z]+)/i,
  ];
  
  for (const pattern of authorPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const author = match[1].trim().replace(/[?.,!]$/, '').replace(/\s+book$/i, '');
      // Check if it looks like a name (has capital letters, reasonable length)
      if (/^[A-Z][a-z]+\s+[A-Z]/.test(author) && author.length > 5 && author.length < 40) {
        return { type: 'author', value: author };
      }
    }
  }
  
  // Check for standalone name pattern (e.g., "Paula McLain")
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(message.trim())) {
    return { type: 'author', value: message.trim() };
  }

  // Genre patterns - common book genres
  const genres = [
    'fiction', 'non-fiction', 'nonfiction', 'mystery', 'thriller', 'romance', 
    'sci-fi', 'science fiction', 'fantasy', 'horror', 'biography', 'autobiography',
    'memoir', 'history', 'historical fiction', 'literary fiction', 'young adult',
    'self-help', 'self help', 'business', 'psychology', 'philosophy', 'religion',
    'spirituality', 'travel', 'cooking', 'art', 'poetry', 'drama', 'comedy',
    'adventure', 'crime', 'suspense', 'dystopian', 'contemporary'
  ];
  
  for (const genre of genres) {
    if (lowerMessage.includes(genre)) {
      // Check if it's a genre request
      if (/(?:want|looking for|recommend|suggest|give me|show me|find).+/i.test(lowerMessage) ||
          lowerMessage.includes('books') || lowerMessage.includes('read')) {
        return { type: 'genre', value: genre };
      }
    }
  }

  // Theme patterns (our curated themes)
  const themeMap = {
    "women's stories": 'women',
    "women's fiction": 'women',
    'female protagonists': 'women',
    'emotional': 'emotional',
    'emotional depth': 'emotional',
    'moving': 'emotional',
    'identity': 'identity',
    'belonging': 'identity',
    'cultural identity': 'identity',
    'spiritual': 'spiritual',
    'spirituality': 'spiritual',
    'meaning': 'spiritual',
    'mindfulness': 'spiritual',
    'justice': 'justice',
    'social justice': 'justice',
    'systemic': 'justice'
  };

  for (const [phrase, theme] of Object.entries(themeMap)) {
    if (lowerMessage.includes(phrase)) {
      return { type: 'theme', value: theme };
    }
  }

  return { type: 'general', value: message };
}

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
 * Format book with description for richer context
 */
function formatBookWithDescription(book) {
  const base = `"${book.book_title}" by ${book.book_author || 'Unknown'}`;
  if (book.description && book.description.length > 20) {
    // Truncate long descriptions to save tokens
    const desc = book.description.length > 150 
      ? book.description.slice(0, 150) + '...' 
      : book.description;
    return `${base} - ${desc}`;
  }
  return base;
}

/**
 * Build user preferences from reading history
 * Now includes descriptions for richer context
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

  // For loved books, include full descriptions (most important for understanding taste)
  if (lovedBooks.length > 0) {
    const topLoved = lovedBooks.slice(0, 10); // Limit to top 10 to manage token usage
    parts.push(
      `⭐⭐⭐⭐⭐ BOOKS USER LOVED (5 stars - ${lovedBooks.length} books):\n${topLoved.map(formatBookWithDescription).join('\n')}\n\nThese are their absolute favorites. Recommend books with similar themes, writing styles, or emotional resonance.`
    );
  }

  // For liked books, include descriptions for top ones
  if (likedBooks.length > 0) {
    const topLiked = likedBooks.slice(0, 5); // Top 5 with descriptions
    parts.push(
      `⭐⭐⭐⭐ BOOKS USER LIKED (4 stars - ${likedBooks.length} books):\n${topLiked.map(formatBookWithDescription).join('\n')}\n\nThey enjoyed these books. Use as positive signals for recommendations.`
    );
  }

  // For disliked books, descriptions help understand what to avoid
  if (lowRatedBooks.length > 0) {
    const topDisliked = lowRatedBooks.slice(0, 5);
    parts.push(
      `👎 BOOKS USER DISLIKED (1-2 stars - ${lowRatedBooks.length} books):\n${topDisliked.map(formatBookWithDescription).join('\n')}\n\nAvoid recommending books with similar themes, styles, or genres to these.`
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

    // Add vector search context if available - now includes intelligent search detection
    let vectorContext = '';
    let isSpecificBookRequest = false; // Track if this is a specific single-book request
    let verifiedBookData = null; // Store verified book data for specific requests
    try {
      // Detect search intent (author, genre, theme, or general)
      const intent = detectSearchIntent(userMessage);
      console.log('[RecommendationService] Detected intent:', intent.type, '-', intent.value);

      if (intent.type === 'author') {
        // Author-specific search - check BOTH Sarah's catalog AND community
        const catalogBooks = await findCatalogBooksByAuthor(intent.value, 10);
        const communityBooks = await findBooksByAuthor(intent.value, 10);
        
        // Check if user is asking for "new/latest" book - this is a SPECIFIC request
        const wantsNew = /\b(new|latest|newest|recent|upcoming|2024|2025|2026)\b/i.test(userMessage);
        isSpecificBookRequest = wantsNew; // Flag for single-book response (uses outer scope variable)
        
        // If user wants NEW book, do a web search to get current info
        let webSearchContext = '';
        if (wantsNew) {
          try {
            const searchResponse = await fetch('/api/web-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: `${intent.value} newest book 2025 2026 release date` 
              }),
            });
            if (searchResponse.ok) {
              const webData = await searchResponse.json();
              if (webData.results && webData.results.length > 0) {
                console.log('[RecommendationService] Web search results:', webData.results.length);
                
                // Look for ISBN in results
                let foundISBN = null;
                let foundTitle = null;
                
                for (const result of webData.results) {
                  if (result.isbn) {
                    foundISBN = result.isbn;
                    foundTitle = result.title;
                    break;
                  }
                }
                
                // If we found ISBN, get exact book data
                if (foundISBN) {
                  console.log('[RecommendationService] Found ISBN:', foundISBN);
                  try {
                    const { enrichBook } = await import('./bookEnrichment.js');
                    const bookData = await enrichBook(foundTitle, intent.value, foundISBN);
                    if (bookData) {
                      // Store verified data to use in response (uses outer scope variable)
                      verifiedBookData = {
                        title: bookData.title,
                        author: bookData.author,
                        isbn: bookData.isbn13 || bookData.isbn,
                        description: bookData.description,
                        coverUrl: bookData.coverUrl
                      };
                      webSearchContext = `\n\n🎯 VERIFIED BOOK DATA (USE EXACTLY AS SHOWN):\nTitle: ${bookData.title}\nAuthor: ${bookData.author}\nISBN: ${bookData.isbn13 || bookData.isbn}\nDescription: ${bookData.description || 'A highly anticipated new release.'}\n\n⚠️ CRITICAL: This is a SPECIFIC book request. Your FIRST recommendation MUST be this exact book with this exact title and author. Do NOT change or modify the title. Do NOT recommend a different book first.`;
                    }
                  } catch (err) {
                    console.log('[RecommendationService] Book lookup failed:', err.message);
                  }
                }
                
                // Fallback to text-based context if no ISBN lookup
                if (!webSearchContext) {
                  const webInfo = webData.results.slice(0, 3).map(r => {
                    if (r.type === 'knowledge') {
                      return `${r.title}: ${r.description || ''}`;
                    } else if (r.type === 'answer') {
                      return `${r.answer || r.title}`;
                    } else {
                      return `${r.title}: ${r.snippet || ''}`;
                    }
                  }).join('\n');
                  webSearchContext = `\n\n🌐 CURRENT WEB SEARCH RESULTS FOR "${intent.value} newest book":\n${webInfo}\n\nIMPORTANT: Use this current information from the web to identify ${intent.value}'s NEWEST book.`;
                }
              }
            }
          } catch (err) {
            console.log('[RecommendationService] Web search failed:', err.message);
          }
        }
        
        // Build catalog context
        if (catalogBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED BOOKS BY ${intent.value.toUpperCase()}:\n${catalogBooks.map((book, i) => 
            `${i + 1}. "${book.title}" (${book.genre || 'Fiction'})\n   Sarah's take: ${book.sarah_assessment || 'A wonderful read.'}`
          ).join('\n')}`;
          
          if (!wantsNew) {
            vectorContext += `\n\nThese are ${intent.value}'s books that Sarah has personally curated. Recommend from this list first, as Sarah has vetted these.`;
          }
        } else if (communityBooks.length > 0) {
          vectorContext = `\n\nBOOKS BY ${intent.value.toUpperCase()} IN OUR COMMUNITY:\n${communityBooks.slice(0, 5).map((book, i) => 
            `${i + 1}. "${book.book_title}"${book.avg_rating ? ` - ${book.avg_rating}/5 avg` : ''}`
          ).join('\n')}`;
          
          if (!wantsNew) {
            vectorContext += `\n\nIMPORTANT: The user is asking about ${intent.value}. Recommend OTHER books by this author NOT in the list above, or suggest similar authors if they've read most of their work.`;
          }
        }
        
        // Add web search context (prioritized for "new" requests)
        if (webSearchContext) {
          // For specific book requests, web search context is PRIMARY - don't dilute with catalog
          if (isSpecificBookRequest && verifiedBookData) {
            vectorContext = webSearchContext; // ONLY use verified data, skip catalog context
          } else {
            vectorContext = webSearchContext + vectorContext;
          }
        } else if (wantsNew && !webSearchContext) {
          // Fallback if web search didn't work
          vectorContext += `\n\nIMPORTANT: The user wants ${intent.value}'s NEWEST/LATEST book. Use your knowledge of this author's bibliography to recommend their most recently published work.`;
        }
      } else if (intent.type === 'genre') {
        // Genre-specific search - check BOTH Sarah's catalog AND community
        const catalogBooks = await findCatalogBooksByGenre(intent.value, 15);
        const communityBooks = await findBooksByGenre(intent.value, 15);
        
        // Prioritize catalog books
        if (catalogBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED ${intent.value.toUpperCase()} BOOKS:\n${catalogBooks.slice(0, 5).map((book, i) => 
            `${i + 1}. "${book.title}" by ${book.author || 'Unknown'}\n   Sarah's take: ${book.sarah_assessment || 'A wonderful read.'}`
          ).join('\n')}`;
          vectorContext += `\n\nThese are ${intent.value} books that Sarah has personally curated. Recommend from this list first.`;
        } else if (communityBooks.length > 0) {
          const topRated = communityBooks.filter(b => b.avg_rating && parseFloat(b.avg_rating) >= 4).slice(0, 5);
          vectorContext = `\n\nTOP ${intent.value.toUpperCase()} BOOKS IN OUR COMMUNITY:\n${topRated.map((book, i) => 
            `${i + 1}. "${book.book_title}" by ${book.book_author || 'Unknown'} - ${book.avg_rating}/5 avg`
          ).join('\n')}`;
          vectorContext += `\n\nThese are highly-rated ${intent.value} books from our readers. Recommend similar books in this genre, prioritizing ones NOT in this list.`;
        }
      } else if (intent.type === 'theme' || (themeFilters && themeFilters.length > 0)) {
        // Theme-specific search (use curated catalog)
        const themes = themeFilters?.length > 0 ? themeFilters : [intent.value];
        const themeBooks = await getBooksByThemes(themes, 10);
        if (themeBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED BOOKS MATCHING THEME "${intent.value}":\n${themeBooks.slice(0, 5).map((book, i) => 
            `${i + 1}. "${book.title}" by ${book.author || 'Unknown'}\n   Sarah's take: ${book.sarah_assessment || 'No assessment available'}`
          ).join('\n\n')}`;
        }
      } else {
        // General semantic search
        const similarBooks = await findSimilarBooks(userMessage, 5, 0.6);
        if (similarBooks.length > 0) {
          vectorContext = `\n\nSARAH'S CURATED BOOKS SIMILAR TO YOUR REQUEST:\n${similarBooks.map((book, i) => 
            `${i + 1}. "${book.title}" by ${book.author || 'Unknown'} (similarity: ${book.similarity.toFixed(2)})\n   Sarah's take: ${book.sarah_assessment || 'No assessment available'}`
          ).join('\n\n')}`;
        }
      }

      // Add cross-user learning context (crowd wisdom) - but NOT for specific book requests
      if (!isSpecificBookRequest || !verifiedBookData) {
        const crowdFavorites = await findSimilarBooksAcrossUsers(userMessage, 5, 0.5);
        if (crowdFavorites.length > 0) {
          const crowdContext = crowdFavorites
            .filter(b => b.avg_rating >= 4 && b.user_count >= 1)
            .slice(0, 3)
            .map((book, i) => 
              `${i + 1}. "${book.book_title}" by ${book.book_author || 'Unknown'} - ${book.avg_rating}/5 (${book.user_count} reader${book.user_count > 1 ? 's' : ''})`
            ).join('\n');
          
          if (crowdContext) {
            vectorContext += `\n\nBOOKS OTHER READERS LOVED (similar to this request):\n${crowdContext}`;
          }
        }
      }

      // Fallback to popular books if no specific matches
      if (!vectorContext) {
        const popularBooks = await getPopularBooks(4, 1);
        if (popularBooks.length > 0) {
          vectorContext = `\n\nHIGHLY RATED BY OUR COMMUNITY:\n${popularBooks.slice(0, 3).map((book, i) => 
            `${i + 1}. "${book.book_title}" by ${book.book_author || 'Unknown'} - ${book.avg_rating}/5 avg (${book.user_count} readers)`
          ).join('\n')}`;
        }
      }
    } catch (error) {
      console.log('Vector search unavailable, using general recommendations:', error.message);
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
