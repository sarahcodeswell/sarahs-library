// Recommendation Service - Spec-compliant implementation
// Single source of truth for recommendation logic
// Uses: Deterministic Router → Recommendation Paths → Response Templates

import { db } from './supabase';
import { routeQuery, fallbackRoute } from './deterministicRouter';
import { executeRecommendationPath } from './recommendationPaths';
import { buildRecommendationPrompt, formatResponseWithTransparency } from './responseTemplates';
import { getTasteAlignmentLabel } from './queryClassifier';

// Cache for reference embeddings (loaded once per session)
let cachedReferenceEmbeddings = null;
let embeddingsLoadAttempted = false;

/**
 * Load reference embeddings from API (cached)
 */
async function loadReferenceEmbeddings() {
  if (cachedReferenceEmbeddings) return cachedReferenceEmbeddings;
  if (embeddingsLoadAttempted) return null; // Don't retry if already failed
  
  embeddingsLoadAttempted = true;
  
  try {
    const response = await fetch('/api/reference-embeddings');
    if (!response.ok) {
      console.warn('[RecommendationService] Failed to load reference embeddings:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.success && data.referenceEmbeddings) {
      cachedReferenceEmbeddings = data.referenceEmbeddings;
      console.log('[RecommendationService] Loaded reference embeddings:', data.stats);
      return cachedReferenceEmbeddings;
    }
  } catch (err) {
    console.warn('[RecommendationService] Error loading reference embeddings:', err.message);
  }
  
  return null;
}

/**
 * Generate embedding for a query using the embeddings API
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query })
    });
    
    if (!response.ok) {
      console.warn('[RecommendationService] Failed to generate query embedding');
      return null;
    }
    
    const data = await response.json();
    return data.embedding || null;
  } catch (err) {
    console.warn('[RecommendationService] Error generating embedding:', err.message);
    return null;
  }
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
 * Get book recommendations - Spec-compliant implementation
 * Flow: Classify Query → Route to Path → Build Context → Generate Response
 */
export async function getRecommendations(userId, userMessage, readingQueue = [], themeFilters = []) {
  try {
    console.log('[RecommendationService] Starting recommendation flow');
    
    // 1. Fetch exclusion list
    let exclusionList = [];
    if (userId) {
      const { data: excludedTitles, error } = await db.getUserExclusionList(userId);
      if (!error && excludedTitles) {
        exclusionList = excludedTitles;
        console.log('[RecommendationService] Exclusion list loaded:', exclusionList.length, 'books');
      }
    }

    // 2. DETERMINISTIC ROUTING - Single source of truth
    // Uses 3-stage process: keywords → embeddings → decision matrix
    // Same query ALWAYS routes to same path (no LLM randomness)
    
    // Try to load reference embeddings for full routing
    const referenceEmbeddings = await loadReferenceEmbeddings();
    
    let routingDecision;
    if (referenceEmbeddings) {
      // Full 3-stage routing with embeddings
      routingDecision = await routeQuery(userMessage, {
        themeFilters,
        getEmbedding: generateQueryEmbedding,
        referenceEmbeddings,
        quickCatalogSearch: null // TODO: implement quick catalog search
      });
    } else {
      // Fallback to keyword-only routing
      routingDecision = fallbackRoute(userMessage, themeFilters);
    }
    
    // Map routing decision to path name (lowercase for executeRecommendationPath)
    const pathMap = {
      'CATALOG': 'catalog',
      'WORLD': 'world',
      'HYBRID': 'hybrid',
      'TEMPORAL': 'temporal'
    };
    const path = pathMap[routingDecision.path] || 'hybrid';
    
    // Build classification object from routing decision for downstream use
    const tasteScore = routingDecision.tasteAlignment ?? 
      (routingDecision.scores?.tasteAlignment) ?? 
      (routingDecision.path === 'CATALOG' ? 1.0 : 0.0);
    
    const classification = {
      intent: routingDecision.path.toLowerCase() + '_search',
      tasteAlignment: { 
        score: tasteScore,
        signals: [routingDecision.reason],
        matchedThemes: routingDecision.themeFilters || []
      },
      specificity: routingDecision.themeFilters?.length > 0 ? 'genre_specific' : 'vague_mood',
      temporalIntent: routingDecision.path === 'TEMPORAL' ? 'recent' : 'any_time',
      entities: { 
        genres: [], 
        authors: [], 
        titles: [], 
        moods: routingDecision.themeFilters || [], 
        timeframe: null 
      },
      originalQuery: userMessage
    };
    
    console.log('[RecommendationService] Routing decision:', {
      path: routingDecision.path,
      reason: routingDecision.reason,
      confidence: routingDecision.confidence,
      themeFilters: routingDecision.themeFilters
    });

    // 4. Execute the appropriate path to get context
    const pathResult = await executeRecommendationPath(path, userMessage, classification, userId);
    
    // 5. Build retrieved context for Claude
    const retrievedContext = {
      catalogBooks: pathResult.books?.filter(b => b.source === 'catalog') || [],
      worldBooks: pathResult.books?.filter(b => b.source === 'world' || b.source === 'temporal') || [],
      verifiedBook: pathResult.verifiedBookData || null
    };

    // Handle hybrid path sections
    if (pathResult.sections) {
      retrievedContext.catalogBooks = pathResult.sections
        .filter(s => s.alignmentCategory === 'sarahs_collection')
        .flatMap(s => s.books);
      retrievedContext.worldBooks = pathResult.sections
        .filter(s => s.alignmentCategory !== 'sarahs_collection')
        .flatMap(s => s.books);
    }
    
    console.log('[RecommendationService] Retrieved context:', {
      catalogBooks: retrievedContext.catalogBooks.length,
      worldBooks: retrievedContext.worldBooks.length,
      hasVerifiedBook: !!retrievedContext.verifiedBook
    });

    // FAST PATH: For curated list requests, bypass Claude and return catalog books directly
    // This guarantees 100% catalog-only results for theme browsing
    const isCuratedListRequest = themeFilters && themeFilters.length > 0;
    if (isCuratedListRequest && retrievedContext.catalogBooks.length >= 3) {
      console.log('[RecommendationService] Fast path: returning catalog books directly for curated list');
      
      // Filter out excluded books
      const availableBooks = retrievedContext.catalogBooks.filter(
        b => !exclusionList.some(ex => ex.toLowerCase() === b.title?.toLowerCase())
      );
      
      // Take top 3 books
      const topBooks = availableBooks.slice(0, 3);
      
      // Build response text with book recommendations
      const themeLabels = {
        women: "Women's Untold Stories",
        emotional: "Emotional Truth",
        identity: "Identity & Belonging",
        spiritual: "Spirituality & Meaning",
        justice: "Justice & Systems"
      };
      const themeName = themeLabels[themeFilters[0]] || themeFilters[0];
      
      const responseText = topBooks.map((book, i) => {
        return `**${book.title}** by ${book.author || 'Unknown'}

Why Sarah recommends: ${book.sarah_assessment || 'A wonderful addition to this collection.'}`;
      }).join('\n\n');
      
      return {
        success: true,
        text: `Here are my top picks from the ${themeName} collection:\n\n${responseText}`,
        exclusionCount: exclusionList.length,
        exclusionList: exclusionList,
        classification: classification,
        path: path,
        fastPath: true
      };
    }

    // 6. Build system prompt
    const systemPrompt = buildSystemPrompt();

    // 7. Build user message with context
    const messageParts = [];

    // Add user preferences from reading history
    const preferences = buildUserPreferences(readingQueue);
    if (preferences) {
      messageParts.push(preferences);
    }

    // Add theme filter requirements
    if (themeFilters && themeFilters.length > 0) {
      const themeLabels = {
        women: "Women's stories",
        emotional: "Emotional truth",
        identity: "Identity & belonging",
        spiritual: "Spirituality & meaning",
        justice: "Justice & systems"
      };
      const selectedThemes = themeFilters.map(t => themeLabels[t] || t).join(', ');
      messageParts.push(`🎯 MANDATORY THEME REQUIREMENT:\nALL recommendations MUST match at least one of these themes: ${selectedThemes}`);
    }

    // Add exclusion list
    const exclusionMessage = buildExclusionMessage(exclusionList);
    if (exclusionMessage) {
      messageParts.push(exclusionMessage);
    }

    // Add classification context
    const alignmentLabel = getTasteAlignmentLabel(classification.tasteAlignment.score);
    messageParts.push(`QUERY ANALYSIS:
- Taste alignment: ${classification.tasteAlignment.score.toFixed(2)} (${alignmentLabel})
- Intent: ${classification.intent}
- Path: ${path}`);

    // Add retrieved context
    let contextText = '';
    
    // For curated list (catalog path with theme filters), ONLY use catalog books
    const isCuratedListRequest = themeFilters && themeFilters.length > 0;
    
    if (retrievedContext.verifiedBook) {
      contextText += `\n\n🎯 VERIFIED BOOK DATA (USE EXACTLY):
Title: ${retrievedContext.verifiedBook.title}
Author: ${retrievedContext.verifiedBook.author}
Description: ${retrievedContext.verifiedBook.description || 'A highly anticipated release.'}

⚠️ This is a SPECIFIC book request. Your FIRST recommendation MUST be this exact book.`;
    }
    
    if (retrievedContext.catalogBooks.length > 0) {
      contextText += `\n\nFROM SARAH'S COLLECTION:
${retrievedContext.catalogBooks.slice(0, 5).map((b, i) => 
  `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}
   Sarah's take: ${b.sarah_assessment || 'A wonderful read.'}`
).join('\n\n')}`;
      
      // For curated lists, enforce catalog-only recommendations
      if (isCuratedListRequest) {
        contextText += `\n\n⚠️ CURATED LIST REQUEST: You MUST ONLY recommend books from Sarah's Collection above. Do NOT suggest any books outside this list.`;
      }
    }
    
    // Only include world books if NOT a curated list request
    if (retrievedContext.worldBooks.length > 0 && !isCuratedListRequest) {
      contextText += `\n\nWORLD RECOMMENDATIONS:
${retrievedContext.worldBooks.slice(0, 5).map((b, i) => 
  `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}
   ${b.description || ''}`
).join('\n\n')}`;
    }
    
    // Fallback when no books found from any path
    if (retrievedContext.catalogBooks.length === 0 && 
        retrievedContext.worldBooks.length === 0 && 
        !retrievedContext.verifiedBook) {
      contextText += `\n\n⚠️ NO SPECIFIC BOOKS RETRIEVED:
I couldn't find specific books from my catalog or web search for this request.
Please use your knowledge to recommend high-quality books that match the user's request.
Focus on well-known, critically acclaimed books in the requested genre/style.
Be honest that these are general recommendations, not from my curated collection.`;
    }

    // Add taste divergence guidance if needed
    if (classification.tasteAlignment.score < -0.3) {
      contextText += `\n\n⚠️ TASTE DIVERGENCE NOTE:
This request is outside Sarah's typical preferences. Focus on QUALITY within the requested genre:
- Structural integrity
- Authentic voice
- Thematic depth
- Critical reception
Be honest: "This isn't my usual genre, but here's what makes a great [genre]..."`;
    }

    messageParts.push(`USER REQUEST:\n${userMessage}${contextText}`);

    const userContent = messageParts.join('\n\n');

    // 8. Call Claude API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }]
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
        exclusionList: exclusionList,
        verifiedBookData: retrievedContext.verifiedBook,
        classification: classification, // Include for UI transparency
        path: path
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
    } else if (trimmed.startsWith('Source:') && currentRec) {
      // New: Parse source/transparency badge
      currentRec.source = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('Why This Fits:') && currentRec) {
      currentRec.why = trimmed.substring(14).trim();
    } else if (trimmed.startsWith('Why:') && currentRec) {
      currentRec.why = trimmed.substring(4).trim();
    } else if (trimmed.startsWith('Description:') && currentRec) {
      currentRec.description = trimmed.substring(12).trim();
    } else if (trimmed.startsWith('Reputation:') && currentRec) {
      currentRec.reputation = trimmed.substring(11).trim();
    } else if (currentRec && currentRec.description && !trimmed.startsWith('Title:') && !trimmed.startsWith('Author:') && !trimmed.startsWith('Source:') && !trimmed.startsWith('Why') && !trimmed.startsWith('Reputation:') && trimmed.length > 0) {
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
