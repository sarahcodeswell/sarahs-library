// Recommendation Paths - Spec-compliant implementation
// Four distinct paths: catalog, world, hybrid, temporal

import { findSimilarBooks, getBooksByThemes, findCatalogBooksByAuthor, findCatalogBooksByGenre } from './vectorSearch';

/**
 * CATALOG PATH
 * When query aligns with Sarah's collection and intent is catalog-focused
 * Returns books from Sarah's 197 curated books
 */
export async function catalogSearchPath(query, classification) {
  console.log('[CatalogPath] Starting catalog search');
  
  const results = {
    source: 'catalog',
    alignmentCategory: 'sarahs_collection',
    books: [],
    explanation: ''
  };

  try {
    const { specificity, entities } = classification;
    
    // Route based on specificity
    if (specificity === 'author_specific' && entities.authors?.length > 0) {
      const author = entities.authors[0];
      const books = await findCatalogBooksByAuthor(author, 10);
      results.books = books.map(b => ({
        ...b,
        source: 'catalog',
        badge: 'From Sarah\'s Collection'
      }));
      results.explanation = `Here are ${author}'s books from my curated collection.`;
      
    } else if (specificity === 'genre_specific' && entities.genres?.length > 0) {
      const genre = entities.genres[0];
      const books = await findCatalogBooksByGenre(genre, 10);
      results.books = books.map(b => ({
        ...b,
        source: 'catalog',
        badge: 'From Sarah\'s Collection'
      }));
      results.explanation = `Here are my favorite ${genre} books.`;
      
    } else if (entities.moods?.length > 0) {
      // Theme/mood search - handles both direct theme keys and descriptive words
      const themeMap = {
        // Direct theme keys (from curated list selection)
        'women': 'women',
        'emotional': 'emotional',
        'identity': 'identity',
        'spiritual': 'spiritual',
        'justice': 'justice',
        // Descriptive words that map to themes
        'moving': 'emotional',
        'female': 'women',
        'belonging': 'identity',
        'mindful': 'spiritual',
        'systemic': 'justice'
      };
      
      const themes = entities.moods
        .map(m => themeMap[m.toLowerCase()] || m.toLowerCase())
        .filter(t => ['women', 'emotional', 'identity', 'spiritual', 'justice'].includes(t));
      
      console.log('[CatalogPath] Theme search for:', themes);
      
      if (themes.length > 0) {
        const books = await getBooksByThemes(themes, 10);
        console.log('[CatalogPath] getBooksByThemes returned:', books?.length, 'books');
        if (books && books.length > 0) {
          results.books = books.map(b => ({
            ...b,
            source: 'catalog',
            badge: 'From Sarah\'s Collection'
          }));
          console.log('[CatalogPath] Mapped to results.books:', results.books.length);
        }
        
        const themeLabels = {
          women: "Women's Stories",
          emotional: "Emotional Truth",
          identity: "Identity & Belonging",
          spiritual: "Spirituality & Meaning",
          justice: "Justice & Systems"
        };
        const themeLabel = themeLabels[themes[0]] || themes[0];
        results.explanation = `Here are books from my ${themeLabel} collection.`;
      }
    }
    
    // Fallback to semantic search
    if (results.books.length === 0) {
      const books = await findSimilarBooks(query, 10, 0.5);
      results.books = books.map(b => ({
        ...b,
        source: 'catalog',
        badge: 'From Sarah\'s Collection'
      }));
      results.explanation = `Here's what I found in my collection that matches your request.`;
    }

  } catch (err) {
    console.error('[CatalogPath] Error:', err);
  }

  console.log('[CatalogPath] Found', results.books.length, 'books');
  return results;
}

/**
 * WORLD PATH
 * When query diverges from Sarah's typical preferences
 * Uses web search + quality framework
 */
export async function worldSearchPath(query, classification) {
  console.log('[WorldPath] Using Claude knowledge for world recommendations');
  
  // SIMPLIFIED: For open discovery queries, let Claude use its knowledge
  // Web search is reserved for TEMPORAL path (new releases) only
  // This is more reliable and produces better quality results
  
  const results = {
    source: 'world',
    alignmentCategory: 'quality_outside_taste',
    books: [], // Empty - Claude will use its knowledge directly
    explanation: '',
    transparencyNote: "This request is outside my curated collection, so I'm drawing on my broader book knowledge.",
    useClaudeKnowledge: true // Flag to tell recommendationService to let Claude recommend freely
  };

  const { tasteAlignment } = classification;
  const genre = classification.entities?.genres?.[0] || 'books';

  // Build explanation based on taste divergence
  if (tasteAlignment.score < -0.3) {
    results.explanation = `This isn't my usual genre, but I can still help you find great ${genre}.`;
  } else {
    results.explanation = `This is outside my curated collection, but I know some excellent options.`;
  }

  console.log('[WorldPath] Delegating to Claude knowledge');
  return results;
}

/**
 * HYBRID PATH
 * When query could be served by catalog OR world
 * Returns both with clear labeling
 */
export async function hybridPath(query, classification) {
  console.log('[HybridPath] Starting hybrid search');
  
  // Get catalog results first
  const catalogResults = await catalogSearchPath(query, classification);
  
  // Determine if catalog is sufficient
  const catalogSufficient = catalogResults.books.length >= 3;
  
  // If catalog is thin, also search world
  let worldResults = null;
  if (!catalogSufficient) {
    worldResults = await worldSearchPath(query, classification);
  }

  // Combine results with clear sections
  const sections = [];
  
  if (catalogResults.books.length > 0) {
    sections.push({
      label: "From Sarah's Collection",
      alignmentCategory: 'sarahs_collection',
      books: catalogResults.books.slice(0, 3),
      note: null
    });
  }
  
  if (worldResults?.books.length > 0) {
    sections.push({
      label: 'Sarah Would Probably Love',
      alignmentCategory: 'sarahs_taste',
      books: worldResults.books.slice(0, 3),
      note: 'Not in my catalog, but aligned with my taste'
    });
  }

  console.log('[HybridPath] Sections:', sections.length);
  
  return {
    source: 'hybrid',
    sections,
    explanation: catalogSufficient 
      ? "Here's what I found in my collection."
      : "I've searched both my collection and beyond."
  };
}

/**
 * TEMPORAL PATH
 * For queries about new releases, upcoming books, or recent publications
 */
export async function temporalSearchPath(query, classification, userId = null) {
  console.log('[TemporalPath] Starting temporal search');
  
  const results = {
    source: 'temporal',
    alignmentCategory: 'sarahs_taste',
    books: [],
    explanation: '',
    temporalNote: ''
  };

  try {
    const { entities, temporalIntent, tasteAlignment } = classification;
    const author = entities.authors?.[0];
    const timeframe = entities.timeframe || (temporalIntent === 'recent' ? '2024 2025' : '');
    
    // Build temporal search query
    let searchQuery;
    if (author) {
      searchQuery = `${author} newest book ${timeframe} release date`;
    } else if (entities.genres?.length > 0) {
      searchQuery = `best ${entities.genres[0]} books ${timeframe} new releases`;
    } else {
      searchQuery = `best new books ${timeframe} releases highly anticipated`;
    }

    // Web search for temporal results
    const searchResponse = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery })
    });

    if (searchResponse.ok) {
      const webData = await searchResponse.json();
      
      if (webData.results?.length > 0) {
        // Try to extract specific book data
        const bookData = await extractAndEnrichBook(webData.results, author);
        
        if (bookData) {
          results.books = [{
            ...bookData,
            source: 'temporal',
            badge: 'New Release',
            verified: true
          }];
          results.verifiedBookData = bookData;
        } else {
          // Fallback to LLM extraction from web results
          const webBooks = await extractBooksFromWebResults(webData.results);
          results.books = webBooks.slice(0, 5).map(b => ({
            ...b,
            source: 'temporal',
            badge: 'New Release'
          }));
        }
      }
    }

    // Build explanation
    if (author) {
      results.explanation = `Here's ${author}'s latest work.`;
      results.temporalNote = `This is their most recent release.`;
    } else {
      results.explanation = `Here are recent releases that fit your request.`;
      results.temporalNote = `These are ${temporalIntent === 'recent' ? 'recently published' : 'upcoming'} books.`;
    }

  } catch (err) {
    console.error('[TemporalPath] Error:', err);
  }

  console.log('[TemporalPath] Found', results.books.length, 'books');
  return results;
}

/**
 * Extract book information from web search results using LLM
 * More robust than regex-based extraction
 */
async function extractBooksFromWebResults(webResults, originalQuery = '') {
  if (!webResults || webResults.length === 0) return [];
  
  const extractionPrompt = `Extract book recommendations from these web search results that are RELEVANT to the search topic.

SEARCH TOPIC: ${originalQuery || 'book recommendations'}

WEB RESULTS:
${webResults.map((r, i) => `[${i + 1}] ${r.title || ''}\n${r.snippet || r.description || ''}`).join('\n\n')}

For each book mentioned that MATCHES THE SEARCH TOPIC, extract:
- title: The book's title (required)
- author: The author's name (if mentioned)
- description: Brief context about why it fits the search topic

IMPORTANT: Only include books that actually match the search topic.
For example, if searching for "Venezuela historical fiction", only include books set in Venezuela.
Do NOT include unrelated books just because they appear in the results.
Return as JSON array. If no relevant books are found, return empty array.
Maximum 5 books.

Example output:
[
  {"title": "The Nightingale", "author": "Kristin Hannah", "description": "heartbreaking WWII novel about sisters in occupied France"},
  {"title": "All the Light We Cannot See", "author": "Anthony Doerr", "description": "Pulitzer Prize winner, beautifully written"}
]`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 800
      })
    });

    if (!response.ok) {
      console.warn('[extractBooksFromWebResults] API call failed');
      return [];
    }

    const data = await response.json();
    const resultText = data.content?.[0]?.text?.trim() || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[extractBooksFromWebResults] No JSON array found in response');
      return [];
    }

    const books = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize
    return books
      .filter(b => b.title && typeof b.title === 'string')
      .map(b => ({
        title: b.title.trim(),
        author: b.author?.trim() || null,
        description: b.description?.trim() || '',
        webSource: null
      }));

  } catch (err) {
    console.error('[extractBooksFromWebResults] Error:', err);
    return [];
  }
}

/**
 * Extract and enrich a specific book from web results
 */
async function extractAndEnrichBook(results, author) {
  // Look for ISBN first
  let foundISBN = null;
  let foundTitle = null;
  
  for (const result of results) {
    if (result.isbn) {
      foundISBN = result.isbn;
      foundTitle = result.title;
      break;
    }
  }
  
  // If no ISBN, extract title from knowledge graph or first result
  if (!foundISBN) {
    const knowledge = results.find(r => r.type === 'knowledge');
    if (knowledge) {
      foundTitle = knowledge.title;
    } else if (results.length > 0) {
      const first = results[0];
      const match = first.title?.match(/^([^-–|]+?)(?:\s*[-–|]|\s+by\s+)/i);
      foundTitle = match ? match[1].trim() : first.title?.split(' - ')[0]?.trim();
    }
  }
  
  // Enrich with Google Books API
  if (foundISBN || foundTitle) {
    try {
      const { enrichBook } = await import('./bookEnrichment.js');
      const bookData = await enrichBook(foundTitle || '', author || '', foundISBN || '');
      
      if (bookData) {
        return {
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn13 || bookData.isbn,
          description: bookData.description,
          coverUrl: bookData.coverUrl
        };
      }
    } catch (err) {
      console.log('[TemporalPath] Book enrichment failed:', err.message);
    }
  }
  
  return null;
}

/**
 * Apply quality filter to web results using Claude
 */
async function applyQualityFilter(books, genre, classification) {
  if (!books || books.length === 0) return [];
  
  const qualityPrompt = `Filter these ${genre} books by quality. Select the 3 best based on:
- Structural integrity (well-constructed narrative)
- Authentic voice (distinctive, not formulaic)
- Thematic depth (about something beyond plot)
- Critical reception (awards, respected reviews)

Books to filter:
${books.slice(0, 10).map((b, i) => `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}: ${b.description?.slice(0, 100) || 'No description'}`).join('\n')}

Respond with ONLY the numbers of the 3 best books, comma-separated (e.g., "1, 3, 5")`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: qualityPrompt }],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.content?.[0]?.text?.trim() || '';
      
      // Parse numbers from response
      const indices = result.match(/\d+/g)?.map(n => parseInt(n) - 1) || [0, 1, 2];
      
      return indices
        .filter(i => i >= 0 && i < books.length)
        .map(i => books[i]);
    }
  } catch (err) {
    console.log('[QualityFilter] Error:', err.message);
  }
  
  // Fallback: return first 3
  return books.slice(0, 3);
}

/**
 * Route to appropriate path based on classification
 */
export async function executeRecommendationPath(path, query, classification, userId = null) {
  switch (path) {
    case 'catalog':
      return await catalogSearchPath(query, classification);
    case 'world':
      return await worldSearchPath(query, classification);
    case 'temporal':
      return await temporalSearchPath(query, classification, userId);
    case 'hybrid':
    default:
      return await hybridPath(query, classification);
  }
}
