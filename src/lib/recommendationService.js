// Recommendation Service - Spec-compliant implementation
// Single source of truth for recommendation logic
// Uses: Deterministic Router → Recommendation Paths → Response Templates

import { db } from './supabase';
import { routeQuery, fallbackRoute, preFilterRoute } from './deterministicRouter';
import { executeRecommendationPath } from './recommendationPaths';
import { buildRecommendationPrompt, formatResponseWithTransparency } from './responseTemplates';
import { getTasteAlignmentLabel } from './queryClassifier';
import { quickCatalogProbe } from './vectorSearch';

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
- When WORLD BOOK RECOMMENDATIONS are provided in the user message, you MUST use those books
- When books from SARAH'S COLLECTION are provided, prioritize those with your personal insights
- If no specific books are provided, use your knowledge to recommend quality books
- Always prioritize BEST FIT - the user wants the perfect book for their specific request
- Never say you "can't find books" or are "having trouble" - always provide 3 recommendations

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
export async function getRecommendations(userId, userMessage, readingQueue = [], themeFilters = [], shownBooksInSession = []) {
  try {
    // Production logging - keep minimal
    
    // 1. Fetch exclusion list
    let exclusionList = [];
    if (userId) {
      const { data: excludedTitles, error } = await db.getUserExclusionList(userId);
      if (!error && excludedTitles) {
        exclusionList = excludedTitles;
        // Exclusion list loaded
      }
    }

    // 2. CATALOG-FIRST ROUTING
    // Stage 1: Check for explicit keyword signals (temporal, catalog, world)
    // Stage 2: Probe catalog to see if it can serve the query
    // Stage 3: Route based on probe results (data-driven, not regex-based)
    
    let routingDecision;
    let catalogProbeResult = null;
    
    // Stage 1: Fast keyword detection (temporal, explicit catalog/world requests)
    const preFilter = preFilterRoute(userMessage, themeFilters);
    
    if (preFilter.confidence === 'high') {
      // Explicit signal detected - use it directly
      routingDecision = {
        path: preFilter.path,
        reason: preFilter.reason,
        confidence: 'high',
        matchedKeyword: preFilter.matchedKeyword,
        themeFilters: preFilter.themeFilters || null,
        source: 'keyword_prefilter'
      };
      console.log(`[Routing] Keyword match: ${preFilter.path} - ${preFilter.reason}`);
    } else {
      // Stage 2: Probe catalog to determine if it can serve this query
      catalogProbeResult = await quickCatalogProbe(userMessage);
      
      if (catalogProbeResult.success) {
        // Stage 3: Route based on probe results (data-driven)
        routingDecision = {
          path: catalogProbeResult.recommendedPath,
          reason: `catalog_probe_${catalogProbeResult.confidence}`,
          confidence: catalogProbeResult.confidence,
          probeMetrics: catalogProbeResult.metrics,
          source: 'catalog_probe'
        };
        console.log(`[Routing] Catalog probe: ${catalogProbeResult.recommendedPath} (max: ${catalogProbeResult.metrics.maxSimilarity.toFixed(2)}, count: ${catalogProbeResult.metrics.matchCount})`);
      } else {
        // Probe failed - fall back to HYBRID as safe default
        routingDecision = {
          path: 'HYBRID',
          reason: 'probe_failed_fallback',
          confidence: 'low',
          source: 'fallback'
        };
        console.log('[Routing] Probe failed, falling back to HYBRID');
      }
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
    
    // Extract author from "new [author]" pattern if detected
    let extractedAuthors = [];
    if (routingDecision.reason === 'new_author_pattern') {
      // Query is "new Paula McLain" or "new Paula McLain novel" - extract author name
      let authorPart = userMessage.substring(4).trim(); // Remove "new "
      // Strip trailing book/novel/release words
      authorPart = authorPart.replace(/\b(book|novel|release|work)s?\s*$/i, '').trim();
      if (authorPart) {
        extractedAuthors = [authorPart];
      }
    }
    
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
        authors: extractedAuthors, 
        titles: [], 
        moods: routingDecision.themeFilters || [], 
        timeframe: null 
      },
      originalQuery: userMessage
    };
    
    // Routing: path, reason logged if needed

    // 4. Execute the appropriate path to get context
    const pathResult = await executeRecommendationPath(path, userMessage, classification, userId);
    
    // Path result processed

    
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
    
    // Context built

    // FAST PATH 1: For temporal requests with a verified book, return it directly
    // This prevents Claude from adding unrelated books to author-specific new release queries
    if (path === 'temporal' && retrievedContext.verifiedBook) {
      const book = retrievedContext.verifiedBook;
      const responseText = `Title: ${book.title}
Author: ${book.author || 'Unknown'}
Why This Fits: This is the latest release from ${book.author || 'this author'}.
Description: ${book.description || 'A highly anticipated new release.'}`;
      
      return {
        success: true,
        text: `Here's the latest from ${book.author || 'this author'}:\n\n${responseText}`,
        exclusionCount: exclusionList.length,
        exclusionList: exclusionList,
        classification: classification,
        path: path,
        fastPath: true,
        verifiedBookData: book
      };
    }
    
    // FAST PATH 2: For curated list requests, bypass Claude and return catalog books directly
    // This guarantees 100% catalog-only results for theme browsing
    const isCuratedListRequest = themeFilters && themeFilters.length > 0;
    if (isCuratedListRequest && retrievedContext.catalogBooks.length >= 3) {
      // Fast path: curated list
      
      // Filter out excluded books AND books already shown in this session
      const shownTitlesLower = (shownBooksInSession || []).map(t => t.toLowerCase());
      const availableBooks = retrievedContext.catalogBooks.filter(
        b => !exclusionList.some(ex => ex.toLowerCase() === b.title?.toLowerCase()) &&
             !shownTitlesLower.includes(b.title?.toLowerCase())
      );
      
      // Build response text in the format parseRecommendations expects
      const themeLabels = {
        women: "Women's Untold Stories",
        emotional: "Emotional Truth",
        identity: "Identity & Belonging",
        spiritual: "Spirituality & Meaning",
        justice: "Justice & Systems"
      };
      const themeName = themeLabels[themeFilters[0]] || themeFilters[0];
      
      // Handle case where user has seen all available books in this theme
      if (availableBooks.length === 0) {
        // Show favorites from this theme that user has already seen
        const allThemeBooks = retrievedContext.catalogBooks.filter(
          b => !exclusionList.some(ex => ex.toLowerCase() === b.title?.toLowerCase())
        );
        const favorites = allThemeBooks
          .filter(b => b.favorite || b.sarah_assessment?.toLowerCase().includes('favorite'))
          .slice(0, 3);
        
        const booksToShow = favorites.length > 0 ? favorites : allThemeBooks.slice(0, 3);
        
        const responseText = booksToShow.map((book) => {
          return `Title: ${book.title}
Author: ${book.author || 'Unknown'}
Why: ${book.sarah_assessment || 'A wonderful addition to this collection.'}`;
        }).join('\n\n');
        
        return {
          success: true,
          text: `You've explored all the books in my ${themeName} collection! Here are my favorites from this theme:\n\n${responseText}`,
          exclusionCount: exclusionList.length,
          exclusionList: exclusionList,
          classification: classification,
          path: path,
          fastPath: true,
          allRead: true,
          shownBooks: booksToShow.map(b => b.title)
        };
      }
      
      // Take top 3 available books (not yet shown in session)
      const topBooks = availableBooks.slice(0, 3);
      
      // Format each book in the structured format the UI expects
      const responseText = topBooks.map((book) => {
        return `Title: ${book.title}
Author: ${book.author || 'Unknown'}
Why: ${book.sarah_assessment || 'A wonderful addition to this collection.'}`;
      }).join('\n\n');
      
      return {
        success: true,
        text: `Here are my top picks from the ${themeName} collection:\n\n${responseText}`,
        exclusionCount: exclusionList.length,
        exclusionList: exclusionList,
        classification: classification,
        path: path,
        fastPath: true,
        shownBooks: topBooks.map(b => b.title)
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
    
    // isCuratedListRequest already defined above for fast path
    
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
      contextText += `\n\n═══════════════════════════════════════
📚 WORLD BOOK RECOMMENDATIONS - YOU MUST USE THESE:
═══════════════════════════════════════
${retrievedContext.worldBooks.slice(0, 5).map((b, i) => 
  `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}
   ${b.description || ''}`
).join('\n\n')}

🚨 CRITICAL INSTRUCTION: 
- These books were found specifically for this request
- You MUST recommend these books in your response
- Format each using: Title:, Author:, Why This Fits:, Description:
- Explain how each book matches the user's specific criteria
- Do NOT say you cannot find books - the books are listed above
- Do NOT apologize or say you're having trouble
═══════════════════════════════════════`;
    }
    
    // WORLD PATH: Let Claude use its knowledge for requests outside catalog
    // This is intentional - we trust Claude's book knowledge for open discovery
    if (retrievedContext.catalogBooks.length === 0 && 
        retrievedContext.worldBooks.length === 0 && 
        !retrievedContext.verifiedBook) {
      contextText += `\n\n📚 OUTSIDE MY CURATED COLLECTION:
This request doesn't match books in my personal catalog. Use your broad book knowledge to recommend excellent books.

IMPORTANT FRAMING:
- Start with: "This is outside my curated collection, but I know some great options..."
- Recommend well-known, critically acclaimed books that truly match the request
- Be specific about WHY each book fits their criteria
- Focus on quality: Goodreads 4.0+, award winners, critical acclaim

This is honest and helpful - we're building features to expand my catalog over time.`;
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
    
    // Context prepared for Claude

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

      const responseText = data.content[0].text;
      
      // Claude response received
      
      // Check if Claude returned an error message instead of recommendations
      // If we have world books but Claude didn't use them, format them directly
      const lowerResponse = responseText.toLowerCase();
      const hasNoRecommendations = lowerResponse.includes("trouble finding") || 
                                    lowerResponse.includes("can't find") ||
                                    lowerResponse.includes("having trouble") ||
                                    lowerResponse.includes("couldn't find") ||
                                    !responseText.includes("Title:");
      
      // Fallback check complete
      
      if (hasNoRecommendations && retrievedContext.worldBooks.length > 0) {
        // Using world books fallback
        const worldBookText = retrievedContext.worldBooks.slice(0, 3).map((book) => {
          return `Title: ${book.title}
Author: ${book.author || 'Unknown'}
Why This Fits: This book matches your request for ${classification.originalQuery || 'this topic'}.
Description: ${book.description || 'A quality book recommendation from web search.'}`;
        }).join('\n\n');
        
        return {
          success: true,
          text: `Here are some quality recommendations from beyond my collection:\n\n${worldBookText}`,
          exclusionCount: exclusionList.length,
          exclusionList: exclusionList,
          classification: classification,
          path: path,
          worldFallback: true
        };
      }

      // For WORLD path (outside catalog), skip post-processing filter
      // Claude is using its knowledge, not our catalog, so exclusion list doesn't apply
      const isWorldPath = path === 'world' && retrievedContext.catalogBooks.length === 0;
      
      return {
        success: true,
        text: responseText,
        exclusionCount: exclusionList.length,
        exclusionList: exclusionList,
        verifiedBookData: retrievedContext.verifiedBook,
        classification: classification,
        path: path,
        skipPostProcessing: isWorldPath // Skip exclusion filter for world path
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
