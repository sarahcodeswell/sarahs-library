// Query Classifier - Spec-compliant implementation
// Analyzes queries for intent, taste alignment, specificity, and temporal intent

/**
 * Sarah's catalog themes for taste alignment scoring
 */
const SARAHS_THEMES = {
  womens_untold_stories: "Books that excavate women's hidden contributions, survival under impossible conditions, and navigation of systems that weren't built for them.",
  emotional_truth: "Stories that cost something to read—that leave the reader changed rather than simply entertained. Psychological depth over plot-driven escapism.",
  identity_belonging: "Characters navigating the gap between their authentic selves and the selves the world expects: racial passing, class performance, gender identity, cultural diaspora.",
  spiritual_seeking: "Pluralistic wisdom across traditions. Working through tensions between ego and authenticity. Meditation, mindfulness, meaning-making.",
  invisible_injustices: "Systems that fail people quietly: criminal justice, historical erasure, suppressed history, institutional corruption."
};

/**
 * Sarah's typical genre distribution (for alignment scoring)
 */
const SARAHS_GENRES = {
  'Literary Fiction': 0.31,
  'Historical Fiction': 0.19,
  'Memoir': 0.15,
  'Self-Help & Spirituality': 0.13,
  'Thriller & Mystery': 0.09,
  'Romance & Contemporary': 0.08,
  'Nonfiction': 0.10
};

/**
 * Classify a user query using Claude
 * Returns full classification per spec
 * 
 * @param {string} query - User's book request
 * @param {object} userContext - Optional user history/preferences
 * @returns {Promise<QueryClassification>}
 */
export async function classifyQuery(query, userContext = null) {
  const classificationPrompt = `Analyze this book recommendation query and classify it.

QUERY: "${query}"

USER CONTEXT: ${userContext ? JSON.stringify(userContext) : 'Anonymous user, no history'}

SARAH'S CATALOG THEMES:
- Women's Untold Stories: Female protagonists, women's history, feminist perspectives
- Emotional Truth: The depths of human experience—grief, joy, love, loss
- Identity & Belonging: Racial identity, cultural diaspora, class, gender, passing
- Spiritual Seeking: Mindfulness, meaning-making, wisdom traditions
- Invisible Injustices: Systemic failures, criminal justice, historical erasure
- Beach Read: Lighthearted, entertaining reads that are pure enjoyment

SARAH'S TYPICAL GENRES: Literary Fiction (31%), Historical Fiction (19%), Memoir (15%), Self-Help & Spirituality (13%), Thriller & Mystery (9%), Romance & Contemporary (8%), Nonfiction (10%)

Classify this query:

1. INTENT: Is the user looking for:
   - catalog_search: Wants books from Sarah's specific collection or themes she covers
   - world_search: Wants recommendations beyond the catalog (different genre, specific external request)
   - hybrid: Open to both catalog and world recommendations
   - temporal: Looking for new releases, upcoming books, or recent publications

2. TASTE_ALIGNMENT (-1.0 to 1.0):
   - 1.0: Perfectly matches Sarah's themes (e.g., "devastating literary fiction about women's hidden history")
   - 0.5: Partial alignment (e.g., "historical fiction" without the emotional depth emphasis)
   - 0.0: Neutral/unclear
   - -0.5: Somewhat divergent (e.g., "cozy mystery", "hard sci-fi")
   - -1.0: Opposite of Sarah's taste (e.g., "fast-paced action thriller with no emotional depth")

3. SPECIFICITY:
   - vague_mood: "something good to read", "I'm bored"
   - genre_specific: "a thriller", "historical fiction"
   - book_specific: "something like The Kite Runner"
   - author_specific: "more by Kristin Hannah"

4. TEMPORAL_INTENT:
   - any_time: No time preference
   - recent: Published in last 1-2 years (2024-2025)
   - upcoming: Not yet released
   - classic: Established, older works

5. ENTITIES: Extract any specific:
   - genres mentioned
   - authors mentioned
   - book titles mentioned
   - moods/themes mentioned
   - timeframes mentioned

Respond in this exact JSON format:
{
  "intent": "catalog_search|world_search|hybrid|temporal",
  "taste_alignment": <number between -1.0 and 1.0>,
  "taste_signals": ["signal1", "signal2"],
  "matched_themes": ["theme1", "theme2"],
  "specificity": "vague_mood|genre_specific|book_specific|author_specific",
  "temporal_intent": "any_time|recent|upcoming|classic",
  "entities": {
    "genres": [],
    "authors": [],
    "titles": [],
    "moods": [],
    "timeframe": null
  }
}`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: classificationPrompt }],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.warn('[QueryClassifier] API call failed, using fallback');
      return getFallbackClassification(query);
    }

    const data = await response.json();
    const resultText = data.content?.[0]?.text?.trim() || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[QueryClassifier] No JSON found in response');
      return getFallbackClassification(query);
    }

    const classification = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize
    const normalized = normalizeClassification(classification, query);
    
    console.log('[QueryClassifier] Classification:', {
      intent: normalized.intent,
      tasteAlignment: normalized.tasteAlignment.score,
      specificity: normalized.specificity,
      temporalIntent: normalized.temporalIntent
    });
    
    return normalized;

  } catch (err) {
    console.error('[QueryClassifier] Error:', err);
    return getFallbackClassification(query);
  }
}

/**
 * Normalize and validate classification response
 */
function normalizeClassification(raw, query) {
  return {
    intent: validateIntent(raw.intent),
    tasteAlignment: {
      score: clamp(parseFloat(raw.taste_alignment) || 0, -1, 1),
      signals: Array.isArray(raw.taste_signals) ? raw.taste_signals : [],
      matchedThemes: Array.isArray(raw.matched_themes) ? raw.matched_themes : []
    },
    specificity: validateSpecificity(raw.specificity),
    temporalIntent: validateTemporalIntent(raw.temporal_intent),
    entities: {
      genres: raw.entities?.genres || [],
      authors: raw.entities?.authors || [],
      titles: raw.entities?.titles || [],
      moods: raw.entities?.moods || [],
      timeframe: raw.entities?.timeframe || null
    },
    originalQuery: query
  };
}

function validateIntent(intent) {
  const valid = ['catalog_search', 'world_search', 'hybrid', 'temporal'];
  return valid.includes(intent) ? intent : 'hybrid';
}

function validateSpecificity(specificity) {
  const valid = ['vague_mood', 'genre_specific', 'book_specific', 'author_specific'];
  return valid.includes(specificity) ? specificity : 'vague_mood';
}

function validateTemporalIntent(temporal) {
  const valid = ['any_time', 'recent', 'upcoming', 'classic'];
  return valid.includes(temporal) ? temporal : 'any_time';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Fallback classification when API fails
 * Uses simple heuristics
 */
function getFallbackClassification(query) {
  const lower = query.toLowerCase();
  
  // Detect temporal intent
  let temporalIntent = 'any_time';
  if (/\b(new|latest|newest|recent|2024|2025|2026|upcoming|coming out)\b/i.test(query)) {
    temporalIntent = 'recent';
  } else if (/\b(classic|timeless|old|vintage)\b/i.test(query)) {
    temporalIntent = 'classic';
  }
  
  // Detect specificity
  let specificity = 'vague_mood';
  if (/\bby\s+[A-Z]/i.test(query) || /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(query.trim())) {
    specificity = 'author_specific';
  } else if (/\blike\s+["']?[A-Z]/i.test(query) || /\bsimilar to\b/i.test(query)) {
    specificity = 'book_specific';
  } else if (/\b(thriller|mystery|romance|memoir|fiction|fantasy|sci-fi|horror)\b/i.test(query)) {
    specificity = 'genre_specific';
  }
  
  // Estimate taste alignment (simple heuristics)
  let tasteScore = 0;
  
  // Positive signals (aligned with Sarah)
  if (/\b(women|female|emotional|moving|literary|identity|belonging|spiritual|justice|systemic)\b/i.test(query)) {
    tasteScore += 0.5;
  }
  if (/\b(devastating|heartbreaking|profound|meaningful|thought-provoking)\b/i.test(query)) {
    tasteScore += 0.3;
  }
  
  // Negative signals (divergent from Sarah)
  if (/\b(light|fun|beach|cozy|easy|quick|escapist)\b/i.test(query)) {
    tasteScore -= 0.4;
  }
  if (/\b(action|fast-paced|thriller|horror|gore)\b/i.test(query)) {
    tasteScore -= 0.3;
  }
  
  tasteScore = clamp(tasteScore, -1, 1);
  
  // Determine intent based on taste alignment and specificity
  let intent = 'hybrid';
  if (temporalIntent === 'recent') {
    intent = 'temporal';
  } else if (tasteScore > 0.3) {
    intent = 'catalog_search';
  } else if (tasteScore < -0.3) {
    intent = 'world_search';
  }
  
  return {
    intent,
    tasteAlignment: {
      score: tasteScore,
      signals: ['fallback_heuristics'],
      matchedThemes: []
    },
    specificity,
    temporalIntent,
    entities: {
      genres: [],
      authors: [],
      titles: [],
      moods: [],
      timeframe: null
    },
    originalQuery: query
  };
}

/**
 * Get human-readable taste alignment label
 */
export function getTasteAlignmentLabel(score) {
  if (score >= 0.7) return 'strongly aligned';
  if (score >= 0.3) return 'partially aligned';
  if (score >= -0.3) return 'neutral';
  if (score >= -0.7) return 'somewhat divergent';
  return 'outside Sarah\'s usual taste';
}

/**
 * Determine which recommendation path to use
 */
export function getRecommendationPath(classification) {
  const { intent, tasteAlignment, temporalIntent } = classification;
  
  // Temporal always takes precedence
  if (intent === 'temporal' || temporalIntent === 'recent' || temporalIntent === 'upcoming') {
    return 'temporal';
  }
  
  // Strong catalog alignment
  if (intent === 'catalog_search' || tasteAlignment.score >= 0.5) {
    return 'catalog';
  }
  
  // Strong divergence from Sarah's taste
  if (intent === 'world_search' || tasteAlignment.score <= -0.3) {
    return 'world';
  }
  
  // Default to hybrid
  return 'hybrid';
}
