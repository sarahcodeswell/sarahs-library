/**
 * Sarah's Books - Deterministic Query Router
 * 
 * This module routes user queries to the appropriate recommendation path
 * using a three-stage deterministic process:
 * 
 * 1. Rule-based pre-filter (keyword detection)
 * 2. Embedding-based scoring (similarity to reference embeddings)
 * 3. Decision matrix (hard thresholds)
 * 
 * The same query will ALWAYS route to the same path - no LLM randomness.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export const ROUTING_THRESHOLDS = {
  // Taste alignment bands
  HIGH_ALIGNMENT: 0.75,      // Strong match with Sarah's taste
  MEDIUM_ALIGNMENT: 0.55,    // Partial overlap
  LOW_ALIGNMENT: 0.40,       // Minimal overlap (below this = divergent)
  
  // Anti-pattern detection
  ANTI_PATTERN_TRIGGER: 0.70, // Route to WORLD if any anti-pattern exceeds this
  
  // Catalog sufficiency checks
  CATALOG_MATCH_GOOD: 0.72,   // Top catalog result similarity for "good match"
  CATALOG_MATCH_MIN: 0.50,    // Minimum similarity to include in results
  CATALOG_RESULTS_SUFFICIENT: 3, // Min catalog results before needing world search
};

// Keywords that trigger immediate routing (no embedding needed)
export const ROUTING_KEYWORDS = {
  // Temporal keywords must be book-specific to avoid false positives
  // "recent events" should NOT trigger temporal, but "recent book" should
  temporal: [
    'new book', 'new novel', 'newest book', 'newest novel',
    'recent book', 'recent release', 'recent novel',
    'latest book', 'latest novel', 'latest release',
    'upcoming book', 'upcoming novel', 'upcoming release',
    'coming out soon', 'coming soon book',
    '2024 release', '2025 release', '2026 release',
    'this year release', 'published this year', 'released this year',
    'just released', 'just came out', 'new releases', 'newly published',
    'what\'s new from', 'recently published', 'brand new book',
    'pre-order', 'preorder', 'not yet released', 'publishing soon',
    'newest from', 'latest from', // "latest from [author]"
    'new by', 'new from' // "new by Paula McLain", "new from Paula McLain"
  ],
  
  catalog: [
    'do you have', 'in your collection', 'in your catalog', 'in your library',
    'from your list', 'sarah\'s', 'your books', 'what have you read',
    'you\'ve reviewed', 'you\'ve read', 'your recommendations',
    'on your site', 'in your database', 'have you reviewed',
    'what do you recommend', 'what would you suggest'
  ],
  
  world: [
    'beyond your', 'outside your', 'other than what you have',
    'besides what you have', 'not in your collection', 'anywhere',
    'in general', 'best overall', 'top rated overall', 'bestsellers',
    'award winners', 'critically acclaimed', 'most popular',
    'everyone is reading', 'trending', 'viral', 'booktok'
  ]
};

// Anti-pattern descriptions (embedded once during setup)
export const ANTI_PATTERN_DESCRIPTIONS = {
  pure_escapism: `
    Light, fun, easy read. Beach book. Vacation read. 
    No heavy themes. Pure entertainment. Don't want to think. 
    Just want to relax. Escapist fiction. Feel-good only.
    Nothing too serious. Light-hearted. Palate cleanser.
    Quick read. Page-turner without depth. Guilty pleasure.
  `,
  
  plot_over_character: `
    Fast-paced action. Thriller with lots of twists.
    Plot-driven. Page-turner. Can't put it down.
    Action-packed. High stakes. Suspenseful.
    Don't care about character development, just want excitement.
    Blockbuster style. Movie-like. Adrenaline rush.
  `,
  
  formulaic_genre: `
    Cozy mystery. Hallmark romance. Clean romance.
    Predictable but comforting. Formula fiction.
    I know what I'm getting. Comfort read.
    Series with familiar characters. No surprises.
    Sweet romance. Closed door. Happily ever after guaranteed.
  `
};

// =============================================================================
// STAGE 1: RULE-BASED PRE-FILTER
// =============================================================================

/**
 * Fast keyword-based routing check
 * Returns immediately if explicit routing signal is detected
 * 
 * @param {string} query - User's search query
 * @param {string[]} themeFilters - Selected theme filters from UI (curated lists)
 * @returns {Object} - { path: string|null, confidence: string|null, reason: string, matchedKeyword: string|null }
 */
export function preFilterRoute(query, themeFilters = []) {
  // HIGHEST PRIORITY: Theme filter selected (user clicked curated list)
  if (themeFilters && themeFilters.length > 0) {
    return {
      path: 'CATALOG',
      confidence: 'high',
      reason: 'theme_filter_selected',
      matchedKeyword: themeFilters.join(', '),
      themeFilters: themeFilters
    };
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check temporal keywords first (most specific intent)
  for (const keyword of ROUTING_KEYWORDS.temporal) {
    if (normalizedQuery.includes(keyword)) {
      return {
        path: 'TEMPORAL',
        confidence: 'high',
        reason: 'temporal_keyword',
        matchedKeyword: keyword
      };
    }
  }
  
  // Special case: "new [Author Name]" or "new [Author] book/novel" pattern
  // e.g., "New Paula McLain", "new Paula McLain novel", "new paula MCLAIN NOVEL"
  if (normalizedQuery.startsWith('new ')) {
    const afterNew = query.substring(4).trim();
    // Check if it ends with book/novel (optional) and has author-like words
    const endsWithBookWord = /\b(book|novel|release|work)s?\s*$/i.test(afterNew);
    const withoutBookWord = afterNew.replace(/\b(book|novel|release|work)s?\s*$/i, '').trim();
    const potentialAuthor = endsWithBookWord ? withoutBookWord : afterNew;
    
    // Author pattern: 2-3 words that look like a name (case-insensitive)
    if (potentialAuthor && potentialAuthor.split(/\s+/).length >= 2 && potentialAuthor.split(/\s+/).length <= 3) {
      return {
        path: 'TEMPORAL',
        confidence: 'high',
        reason: 'new_author_pattern',
        matchedKeyword: 'new [author]'
      };
    }
  }
  
  // Check explicit catalog references
  for (const keyword of ROUTING_KEYWORDS.catalog) {
    if (normalizedQuery.includes(keyword)) {
      return {
        path: 'CATALOG',
        confidence: 'high',
        reason: 'catalog_keyword',
        matchedKeyword: keyword
      };
    }
  }
  
  // Check explicit world/general references
  for (const keyword of ROUTING_KEYWORDS.world) {
    if (normalizedQuery.includes(keyword)) {
      return {
        path: 'WORLD',
        confidence: 'high',
        reason: 'world_keyword',
        matchedKeyword: keyword
      };
    }
  }
  
  // Check for specific geographic/historical/cultural topics that are unlikely in catalog
  // These should route to WORLD unless they also mention Sarah's core themes
  const specificTopicPatterns = [
    /\b(venezuela|argentina|brazil|chile|peru|colombia|mexico|cuba|haiti|jamaica|puerto rico)\b/i,
    /\b(nigeria|kenya|south africa|egypt|morocco|ethiopia|ghana|senegal)\b/i,
    /\b(india|pakistan|bangladesh|vietnam|thailand|philippines|indonesia|malaysia)\b/i,
    /\b(russia|ukraine|poland|hungary|czech|romania|serbia|croatia)\b/i,
    /\b(china|japan|korea|taiwan)\b/i,
    /\b(iran|iraq|syria|lebanon|palestine|israel|saudi|yemen|afghanistan)\b/i,
    /\b(wwii|ww2|world war|civil war|revolution|colonial|independence)\b/i,
    /\b(19th century|18th century|medieval|ancient|victorian|renaissance)\b/i,
    /\b(sci-fi|science fiction|fantasy|horror|thriller|mystery|detective|crime fiction)\b/i,
  ];
  
  const sarahsThemes = ['women', 'woman', 'female', 'mother', 'daughter', 'sister', 'emotional', 'identity', 'belonging', 'spiritual', 'justice', 'family'];
  const mentionsSarahsThemes = sarahsThemes.some(theme => normalizedQuery.includes(theme));
  
  // If specific topic detected WITHOUT Sarah's themes, route to WORLD
  for (const pattern of specificTopicPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match && !mentionsSarahsThemes) {
      return {
        path: 'WORLD',
        confidence: 'high',
        reason: 'specific_topic_outside_catalog',
        matchedKeyword: match[0]
      };
    }
  }
  
  // No explicit signal found
  return {
    path: null,
    confidence: null,
    reason: 'no_keyword_match',
    matchedKeyword: null
  };
}

// =============================================================================
// STAGE 2: EMBEDDING-BASED CLASSIFICATION
// =============================================================================

/**
 * Compute cosine similarity between two vectors
 * This is deterministic - same inputs always produce same output
 * 
 * @param {number[]} vecA - First embedding vector
 * @param {number[]} vecB - Second embedding vector
 * @returns {number} - Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    console.warn('[Router] Vector dimension mismatch or null vectors');
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Average multiple embedding vectors into a single centroid
 * Used to compute reference embeddings from groups of books
 * 
 * @param {number[][]} embeddings - Array of embedding vectors
 * @returns {number[]} - Averaged centroid vector
 */
export function averageEmbeddings(embeddings) {
  if (!embeddings || embeddings.length === 0) {
    console.warn('[Router] Cannot average empty embeddings array');
    return null;
  }
  
  const dimensions = embeddings[0].length;
  const centroid = new Array(dimensions).fill(0);
  
  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += embedding[i];
    }
  }
  
  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= embeddings.length;
  }
  
  return centroid;
}

/**
 * Score a query against all reference embeddings
 * 
 * @param {number[]} queryEmbedding - Embedding of the user's query
 * @param {Object} referenceEmbeddings - Pre-computed reference embeddings
 * @returns {Object} - All similarity scores
 */
export function computeScores(queryEmbedding, referenceEmbeddings) {
  const scores = {
    // Overall taste alignment
    tasteAlignment: 0,
    
    // Theme scores
    themes: {},
    
    // Genre scores
    genres: {},
    
    // Anti-pattern scores
    antiPatterns: {},
    
    // Metadata
    topTheme: null,
    topGenre: null,
    triggeredAntiPattern: null
  };
  
  if (!queryEmbedding || !referenceEmbeddings) {
    console.warn('[Router] Missing query embedding or reference embeddings');
    return scores;
  }
  
  // Overall taste alignment
  if (referenceEmbeddings.sarahs_taste_centroid) {
    scores.tasteAlignment = cosineSimilarity(
      queryEmbedding,
      referenceEmbeddings.sarahs_taste_centroid
    );
  }
  
  // Score against each theme
  if (referenceEmbeddings.themes) {
    for (const [theme, embedding] of Object.entries(referenceEmbeddings.themes)) {
      scores.themes[theme] = cosineSimilarity(queryEmbedding, embedding);
    }
  }
  
  // Score against each genre
  if (referenceEmbeddings.genres) {
    for (const [genre, embedding] of Object.entries(referenceEmbeddings.genres)) {
      scores.genres[genre] = cosineSimilarity(queryEmbedding, embedding);
    }
  }
  
  // Score against anti-patterns
  if (referenceEmbeddings.antiPatterns) {
    for (const [pattern, embedding] of Object.entries(referenceEmbeddings.antiPatterns)) {
      scores.antiPatterns[pattern] = cosineSimilarity(queryEmbedding, embedding);
    }
  }
  
  // Find top matches
  if (Object.keys(scores.themes).length > 0) {
    scores.topTheme = Object.entries(scores.themes)
      .sort(([, a], [, b]) => b - a)[0];
  }
  
  if (Object.keys(scores.genres).length > 0) {
    scores.topGenre = Object.entries(scores.genres)
      .sort(([, a], [, b]) => b - a)[0];
  }
  
  // Check for triggered anti-patterns
  if (Object.keys(scores.antiPatterns).length > 0) {
    const maxAntiPattern = Object.entries(scores.antiPatterns)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (maxAntiPattern && maxAntiPattern[1] > ROUTING_THRESHOLDS.ANTI_PATTERN_TRIGGER) {
      scores.triggeredAntiPattern = {
        name: maxAntiPattern[0],
        score: maxAntiPattern[1]
      };
    }
  }
  
  return scores;
}

// =============================================================================
// STAGE 3: DECISION MATRIX
// =============================================================================

/**
 * Apply hard thresholds to determine final route
 * This is the deterministic decision point
 * 
 * @param {Object} preFilterResult - Result from Stage 1
 * @param {Object} scores - Result from Stage 2
 * @param {Object} catalogPreview - Quick catalog search results (optional)
 * @returns {Object} - Final routing decision
 */
export function applyDecisionMatrix(preFilterResult, scores, catalogPreview = null) {
  // Pre-filter takes absolute precedence if confident
  if (preFilterResult.confidence === 'high') {
    return {
      path: preFilterResult.path,
      subtype: preFilterResult.themeFilters ? 'theme_browse' : null,
      reason: preFilterResult.reason,
      confidence: 'high',
      matchedKeyword: preFilterResult.matchedKeyword,
      themeFilters: preFilterResult.themeFilters || null,
      scores: scores
    };
  }
  
  // Check anti-patterns first (overrides taste alignment)
  if (scores.triggeredAntiPattern) {
    return {
      path: 'WORLD',
      subtype: 'quality_outside_taste',
      reason: `anti_pattern_${scores.triggeredAntiPattern.name}`,
      confidence: 'high',
      antiPatternScore: scores.triggeredAntiPattern.score,
      tasteAlignment: scores.tasteAlignment,
      scores: scores
    };
  }
  
  // High taste alignment
  if (scores.tasteAlignment > ROUTING_THRESHOLDS.HIGH_ALIGNMENT) {
    // Check if catalog has sufficient matches
    const catalogHasGoodMatch = catalogPreview && 
      catalogPreview.length > 0 && 
      catalogPreview[0].similarity > ROUTING_THRESHOLDS.CATALOG_MATCH_GOOD;
    
    const catalogHasSufficientResults = catalogPreview && 
      catalogPreview.length >= ROUTING_THRESHOLDS.CATALOG_RESULTS_SUFFICIENT;
    
    if (catalogHasGoodMatch && catalogHasSufficientResults) {
      return {
        path: 'CATALOG',
        subtype: null,
        reason: 'high_alignment_good_catalog',
        confidence: 'high',
        tasteAlignment: scores.tasteAlignment,
        topCatalogMatch: catalogPreview[0].similarity,
        scores: scores
      };
    } else {
      return {
        path: 'HYBRID',
        subtype: 'catalog_plus_extrapolation',
        reason: 'high_alignment_thin_catalog',
        confidence: 'medium',
        tasteAlignment: scores.tasteAlignment,
        catalogResultCount: catalogPreview?.length || 0,
        scores: scores
      };
    }
  }
  
  // Medium taste alignment
  if (scores.tasteAlignment > ROUTING_THRESHOLDS.MEDIUM_ALIGNMENT) {
    return {
      path: 'HYBRID',
      subtype: 'balanced',
      reason: 'medium_alignment',
      confidence: 'medium',
      tasteAlignment: scores.tasteAlignment,
      scores: scores
    };
  }
  
  // Low taste alignment (but no anti-pattern triggered)
  return {
    path: 'WORLD',
    subtype: 'quality_outside_taste',
    reason: 'low_alignment',
    confidence: 'medium',
    tasteAlignment: scores.tasteAlignment,
    scores: scores
  };
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

/**
 * Main routing function - orchestrates all three stages
 * 
 * @param {string} query - User's search query
 * @param {Object} options - Routing options
 * @param {string[]} options.themeFilters - Selected theme filters from UI
 * @param {Function} options.getEmbedding - Function to generate embedding from text
 * @param {Object} options.referenceEmbeddings - Pre-computed reference embeddings
 * @param {Function} options.quickCatalogSearch - Function to do fast catalog similarity search
 * @returns {Object} - Complete routing decision with all metadata
 */
export async function routeQuery(query, options = {}) {
  const { 
    themeFilters = [], 
    getEmbedding, 
    referenceEmbeddings, 
    quickCatalogSearch 
  } = options;
  
  const startTime = Date.now();
  const routingLog = {
    query,
    timestamp: new Date().toISOString(),
    stages: {}
  };
  
  // ---------------------------------------------------------------------------
  // STAGE 1: Rule-based pre-filter
  // ---------------------------------------------------------------------------
  const stage1Start = Date.now();
  const preFilterResult = preFilterRoute(query, themeFilters);
  routingLog.stages.preFilter = {
    durationMs: Date.now() - stage1Start,
    result: preFilterResult
  };
  
  // If pre-filter is confident, we can skip embedding computation
  if (preFilterResult.confidence === 'high') {
    const route = applyDecisionMatrix(preFilterResult, {}, null);
    
    routingLog.finalRoute = route;
    routingLog.totalDurationMs = Date.now() - startTime;
    routingLog.skippedEmbedding = true;
    
    console.log('[Router] Pre-filter match:', route.path, '-', route.reason);
    
    return {
      ...route,
      _debug: routingLog
    };
  }
  
  // ---------------------------------------------------------------------------
  // STAGE 2: Embedding-based classification (if we have the functions)
  // ---------------------------------------------------------------------------
  let scores = {};
  let catalogPreview = null;
  
  if (getEmbedding && referenceEmbeddings) {
    const stage2Start = Date.now();
    
    // Generate query embedding
    const queryEmbedding = await getEmbedding(query);
    
    // Compute all similarity scores
    scores = computeScores(queryEmbedding, referenceEmbeddings);
    
    routingLog.stages.embeddingScores = {
      durationMs: Date.now() - stage2Start,
      tasteAlignment: scores.tasteAlignment?.toFixed(4),
      topTheme: scores.topTheme,
      topGenre: scores.topGenre,
      triggeredAntiPattern: scores.triggeredAntiPattern
    };
    
    // ---------------------------------------------------------------------------
    // STAGE 2.5: Quick catalog search (informs routing decision)
    // ---------------------------------------------------------------------------
    if (quickCatalogSearch) {
      const stage25Start = Date.now();
      catalogPreview = await quickCatalogSearch(queryEmbedding, 5);
      
      routingLog.stages.catalogPreview = {
        durationMs: Date.now() - stage25Start,
        resultCount: catalogPreview?.length || 0,
        topMatch: catalogPreview?.[0]?.similarity?.toFixed(4) || null
      };
    }
  } else {
    // No embedding functions available - use fallback
    console.log('[Router] No embedding functions - using fallback routing');
    routingLog.stages.embeddingScores = { skipped: true, reason: 'no_embedding_functions' };
  }
  
  // ---------------------------------------------------------------------------
  // STAGE 3: Decision matrix
  // ---------------------------------------------------------------------------
  const stage3Start = Date.now();
  const route = applyDecisionMatrix(preFilterResult, scores, catalogPreview);
  
  routingLog.stages.decisionMatrix = {
    durationMs: Date.now() - stage3Start
  };
  
  routingLog.finalRoute = {
    path: route.path,
    subtype: route.subtype,
    reason: route.reason,
    confidence: route.confidence
  };
  routingLog.totalDurationMs = Date.now() - startTime;
  routingLog.skippedEmbedding = !getEmbedding;
  
  console.log('[Router] Final route:', route.path, '-', route.reason, 
    `(alignment: ${scores.tasteAlignment?.toFixed(2) || 'N/A'})`);
  
  return {
    ...route,
    _debug: routingLog
  };
}

// =============================================================================
// FALLBACK ROUTER (when embeddings not available)
// =============================================================================

/**
 * Simple fallback router that uses only keyword matching
 * Used when reference embeddings haven't been computed yet
 * 
 * @param {string} query - User's search query
 * @param {string[]} themeFilters - Selected theme filters
 * @returns {Object} - Routing decision
 */
export function fallbackRoute(query, themeFilters = []) {
  const preFilter = preFilterRoute(query, themeFilters);
  
  if (preFilter.confidence === 'high') {
    return {
      path: preFilter.path,
      subtype: preFilter.themeFilters ? 'theme_browse' : null,
      reason: preFilter.reason,
      confidence: 'high',
      matchedKeyword: preFilter.matchedKeyword,
      themeFilters: preFilter.themeFilters || null,
      isFallback: true
    };
  }
  
  // Smart fallback: detect specific/niche queries that should go to WORLD
  const lowerQuery = query.toLowerCase();
  
  // Specific geographic/historical/cultural topics → WORLD
  const specificTopicPatterns = [
    /\b(history|historical)\b.*\b(of|about|from)\b/i,
    /\b(venezuela|argentina|brazil|chile|peru|colombia|mexico|cuba|haiti|jamaica)\b/i,
    /\b(african|asian|middle eastern|european|latin american|caribbean)\b/i,
    /\b(wwii|ww2|world war|civil war|revolution|colonial|independence)\b/i,
    /\b(19th century|18th century|medieval|ancient|victorian|renaissance)\b/i,
    /\b(true story|based on|real events|biography|memoir)\b/i,
    /\b(science fiction|sci-fi|fantasy|horror|thriller|mystery|crime|detective)\b/i,
    /\b(best|top|greatest|most popular|award.?winning|pulitzer|booker|nobel)\b/i,
  ];
  
  const isSpecificTopic = specificTopicPatterns.some(pattern => pattern.test(lowerQuery));
  
  // Check if query mentions Sarah's themes (more likely in catalog)
  const sarahsThemes = ['women', 'emotional', 'identity', 'belonging', 'spiritual', 'justice', 'family', 'mother', 'daughter', 'sister'];
  const mentionsSarahsThemes = sarahsThemes.some(theme => lowerQuery.includes(theme));
  
  // Specific topic WITHOUT Sarah's themes → WORLD
  if (isSpecificTopic && !mentionsSarahsThemes) {
    return {
      path: 'WORLD',
      subtype: 'specific_topic',
      reason: 'specific_topic_outside_catalog',
      confidence: 'medium',
      isFallback: true
    };
  }
  
  // Mentions Sarah's themes → CATALOG first
  if (mentionsSarahsThemes) {
    return {
      path: 'CATALOG',
      subtype: 'theme_match',
      reason: 'matches_sarahs_themes',
      confidence: 'medium',
      isFallback: true
    };
  }
  
  // Default to HYBRID when truly ambiguous
  return {
    path: 'HYBRID',
    subtype: 'balanced',
    reason: 'fallback_no_embeddings',
    confidence: 'low',
    isFallback: true
  };
}
