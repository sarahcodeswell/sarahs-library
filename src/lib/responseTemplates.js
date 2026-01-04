// Response Templates - Spec-compliant implementation
// Generates Claude prompts and formats responses with transparency markers

import { getTasteAlignmentLabel } from './queryClassifier';

/**
 * Build the main recommendation prompt based on classification and retrieved context
 */
export function buildRecommendationPrompt(query, classification, retrievedContext, userProfile = null) {
  const { tasteAlignment, specificity, temporalIntent, entities } = classification;
  const alignmentLabel = getTasteAlignmentLabel(tasteAlignment.score);
  
  return `You are the recommendation engine for Sarah's Books, a curated book recommendation platform.

## YOUR ROLE
You provide book recommendations that are:
1. Transparent about source (Sarah's catalog vs. world recommendations)
2. Honest about taste alignment (whether this matches Sarah's preferences or diverges)
3. Grounded in quality (good books are good books, regardless of genre)

## SARAH'S CURATORIAL IDENTITY
Sarah reads for emotional transformation, not escapism. Her 197-book catalog emphasizes:
- Women's Untold Stories: Female protagonists navigating impossible circumstances
- Emotional Truth: Books that "cost something to read"
- Identity & Belonging: Racial, cultural, class, and gender navigation
- Spiritual Seeking: Wisdom across traditions
- Invisible Injustices: Systems that fail people quietly

Her typical genres: Literary Fiction (31%), Historical Fiction (19%), Memoir (15%)

## THE CURRENT QUERY
User asked: "${query}"

Query classification:
- Intent: ${classification.intent}
- Taste alignment with Sarah: ${tasteAlignment.score.toFixed(2)} (${alignmentLabel})
- Specificity: ${specificity}
- Temporal intent: ${temporalIntent}
- Extracted entities: ${JSON.stringify(entities)}

${userProfile ? `
## USER PROFILE
This is a returning user with reading history.
- Their taste alignment with Sarah: ${userProfile.sarahAlignmentScore?.toFixed(2) || 'unknown'}
- Preferred genres: ${userProfile.preferredGenres?.join(', ') || 'Not specified'}
- Avoids: ${userProfile.avoidedContent?.join(', ') || 'None specified'}
` : '## USER PROFILE\nAnonymous or new user. Default to Sarah\'s taste as baseline.'}

## RETRIEVED CONTEXT
${formatRetrievedContext(retrievedContext)}

## YOUR TASK
Provide book recommendations following these rules:

### If query ALIGNS with Sarah's taste (score > 0.3):
1. Prioritize books from Sarah's catalog
2. For catalog books, use Sarah's voice and her assessments
3. If extrapolating beyond catalog, explain why Sarah would love it
4. Label clearly: "From Sarah's Collection" or "Sarah Would Probably Love"

### If query DIVERGES from Sarah's taste (score < -0.3):
1. Acknowledge the divergence honestly but warmly
2. Shift to QUALITY framework: "This isn't my usual genre, but here's what makes a great [genre]..."
3. Recommend the BEST of the requested genre based on:
   - Structural integrity
   - Authentic voice  
   - Thematic depth
   - Critical reception
4. Label clearly: "Quality Picks Outside My Usual"

### For ALL recommendations:
- Never force Sarah's taste on someone who wants something different
- Be honest about what you have and haven't read
- Include relevant content warnings if known
- Explain WHY each book fits the request

## RESPONSE FORMAT
Always respond with exactly this structure:

My Top 3 Picks for You

[RECOMMENDATION 1]
Title: [Book Title]
Author: [Author Name]
Source: [From Sarah's Collection | Sarah Would Probably Love | Quality Pick]
Why This Fits: [1-2 sentences explaining why this matches their request]
Description: [2-3 sentence description of the book]
Reputation: [Mention Goodreads rating, awards, or recognition if notable]

[RECOMMENDATION 2]
...same format...

[RECOMMENDATION 3]
...same format...

${tasteAlignment.score < -0.3 ? `
A Note on These Picks:
[Brief acknowledgment that this is outside your usual taste, but you've focused on quality within the genre]
` : ''}

IMPORTANT: You MUST return exactly 3 recommendations. Each MUST include a line starting with "Title:".

Now provide recommendations for: "${query}"`;
}

/**
 * Format retrieved context for the prompt
 */
function formatRetrievedContext(context) {
  if (!context) return 'No specific context retrieved.';
  
  const parts = [];
  
  // Catalog books
  if (context.catalogBooks?.length > 0) {
    parts.push(`SARAH'S CURATED BOOKS (from her collection):
${context.catalogBooks.map((b, i) => 
  `${i + 1}. "${b.title}" by ${b.author}
   Genre: ${b.genre || 'Fiction'}
   Sarah's take: ${b.sarah_assessment || 'A wonderful read.'}`
).join('\n\n')}`);
  }
  
  // World/web results
  if (context.worldBooks?.length > 0) {
    parts.push(`BOOKS FROM BEYOND THE CATALOG:
${context.worldBooks.map((b, i) => 
  `${i + 1}. "${b.title}" by ${b.author || 'Unknown'}
   ${b.description || ''}`
).join('\n\n')}`);
  }
  
  // Verified book data (for temporal/specific requests)
  if (context.verifiedBook) {
    parts.push(`🎯 VERIFIED BOOK DATA (USE EXACTLY AS SHOWN):
Title: ${context.verifiedBook.title}
Author: ${context.verifiedBook.author}
ISBN: ${context.verifiedBook.isbn || 'N/A'}
Description: ${context.verifiedBook.description || 'A highly anticipated release.'}

⚠️ CRITICAL: This is a SPECIFIC book request. Your FIRST recommendation MUST be this exact book.`);
  }
  
  return parts.join('\n\n') || 'No specific context retrieved.';
}

/**
 * Build prompt for taste-divergent queries
 */
export function buildTasteDivergencePrompt(query, genre, catalogMatches) {
  return `The user is asking for something outside Sarah's typical taste. Handle this gracefully.

USER QUERY: "${query}"
REQUESTED: ${genre}

SARAH'S CLOSEST MATCHES (if any):
${catalogMatches?.length > 0 
  ? catalogMatches.map(b => `- ${b.title}: ${b.description?.slice(0, 100) || ''}...`).join('\n')
  : 'No close matches in catalog.'}

SARAH'S TYPICAL TASTE:
- Prefers: Literary fiction, emotional depth, women's stories, systemic critique
- Avoids: Pure escapism, plot-over-character, surface-level entertainment

YOUR RESPONSE SHOULD:

1. Acknowledge warmly without judgment:
   "Looking for something lighter? I get it—not every read needs to be emotionally devastating!"
   
2. Check if Sarah has ANYTHING relevant:
   "Let me see if I have anything that might bridge the gap..."
   
3. If no catalog matches, pivot to quality:
   "This isn't my usual wheelhouse, but I know what makes a great [genre]. Here's what I'd recommend based on quality..."

4. Recommend the BEST of their requested genre:
   - Award winners in that genre
   - Critical favorites
   - Books that elevate the genre
   
5. Be honest about your limits:
   "I haven't read these myself, but by every quality marker, they're the best of [genre]."

DO NOT:
- Make the user feel bad for wanting something different
- Refuse to help because it's not "Sarah's taste"
- Recommend poor-quality books just because they match the genre request
- Pretend Sarah's taste is the only valid taste`;
}

/**
 * Build quality assessment prompt for external books
 */
export function buildQualityAssessmentPrompt(bookInfo, genre) {
  return `Assess this book's quality using Sarah's Books universal quality framework.

BOOK: "${bookInfo.title}" by ${bookInfo.author || 'Unknown'}
GENRE: ${genre}
AVAILABLE INFO: ${bookInfo.description || 'No description available'}

Assess on these dimensions (1-5 scale):

1. STRUCTURAL INTEGRITY - Is the narrative well-constructed?
2. WRITING CRAFT - Is there a distinctive voice?
3. THEMATIC DEPTH - Is the book about something beyond its plot?
4. CHARACTER WORK - Are characters psychologically complex?
5. CRITICAL RECEPTION - Major awards or respected reviews?

IMPORTANT: Assess quality FOR ITS GENRE. A great cozy mystery should be judged as a cozy mystery.

Respond with:
- Overall quality tier: "Exceptional" / "Strong" / "Solid" / "Mixed" / "Weak"
- One-line summary of quality assessment`;
}

/**
 * Get response template based on alignment quadrant
 */
export function getResponseTemplate(tasteScore, qualityScore = null) {
  // High quality + High alignment = Sarah's sweet spot
  if (tasteScore >= 0.3) {
    return {
      label: "From Sarah's Collection",
      intro: "This is exactly the kind of book I curate—",
      emphasis: "quality + personal recommendation",
      confidence: "high"
    };
  }
  
  // High quality + Low alignment = Quality outside taste
  if (tasteScore <= -0.3) {
    return {
      label: "Quality Pick Outside My Usual",
      intro: "This isn't my typical genre, but it's the best of its kind—",
      emphasis: "quality markers, critical reception",
      confidence: "medium",
      caveat: "I haven't read this myself, but by every quality metric, it's excellent."
    };
  }
  
  // Neutral
  return {
    label: "Sarah Would Probably Love",
    intro: "Based on what I know about great books—",
    emphasis: "balanced recommendation",
    confidence: "medium"
  };
}

/**
 * Format final response with transparency markers
 */
export function formatResponseWithTransparency(recommendations, classification) {
  const { tasteAlignment } = classification;
  
  return recommendations.map(rec => ({
    ...rec,
    transparencyBadge: getBadgeForBook(rec, tasteAlignment.score),
    alignmentNote: getAlignmentNote(rec, tasteAlignment.score)
  }));
}

function getBadgeForBook(book, tasteScore) {
  if (book.source === 'catalog') {
    return "From Sarah's Collection";
  }
  if (book.source === 'temporal') {
    return "New Release";
  }
  if (tasteScore >= 0.3) {
    return "Sarah Would Probably Love";
  }
  if (tasteScore <= -0.3) {
    return "Quality Pick";
  }
  return "Recommended";
}

function getAlignmentNote(book, tasteScore) {
  if (book.source === 'catalog') {
    return null; // No note needed for catalog books
  }
  if (tasteScore <= -0.3) {
    return "Outside my usual taste, but high quality for its genre.";
  }
  if (book.source === 'world') {
    return "Not in my catalog, but aligned with my curatorial standards.";
  }
  return null;
}
