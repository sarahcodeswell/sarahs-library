# Recommendation Architecture V2

## Overview

This document specifies the architecture for Sarah's Books recommendation system, designed to provide high-quality, grounded book recommendations with minimal hallucination risk.

**Key Principle**: Claude is a "translator" and "formatter", not a "decider". All routing and data retrieval is deterministic code.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                   │
│              "I like reading Kristin Hannah, who else?"             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: QUERY EXTRACTION                                            │
│  ═══════════════════════════════════════════════════════════════════ │
│  Component: queryExtractor.js                                        │
│  Method: Claude Tool Use                                             │
│  Tool: extract_search_intent                                         │
│  Temperature: 0                                                      │
│                                                                      │
│  Input: Raw user query                                               │
│  Output: {                                                           │
│    search_query: "optimized semantic search query",                  │
│    author_mentioned: "Kristin Hannah" | null,                        │
│    book_mentioned: "The Nightingale" | null,                         │
│    intent: enum["similar_author", "similar_book", "theme_search",    │
│                 "mood_search", "new_releases", "browse"],            │
│    themes: ["women", "emotional", ...]                               │
│  }                                                                   │
│                                                                      │
│  ⚠️ Claude does NOT:                                                 │
│     - Suggest books                                                  │
│     - Make routing decisions                                         │
│     - Access external data                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: ENTITY VALIDATION                                          │
│  ═══════════════════════════════════════════════════════════════════ │
│  Component: entityValidator.js                                       │
│  Method: Deterministic code (NO LLM)                                 │
│                                                                      │
│  Validations:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 1. Author Verification                                          ││
│  │    - Check if author_mentioned exists in catalog                ││
│  │    - Fuzzy match against known authors list                     ││
│  │    - If not found: set author_mentioned = null                  ││
│  │                                                                 ││
│  │ 2. Book Verification                                            ││
│  │    - Check if book_mentioned exists in catalog                  ││
│  │    - Fuzzy match against known titles                           ││
│  │    - If not found: set book_mentioned = null                    ││
│  │                                                                 ││
│  │ 3. Theme Mapping                                                ││
│  │    - Filter themes to Sarah's allowed theme list                ││
│  │    - ALLOWED_THEMES = [women, emotional, identity, justice,     ││
│  │                        spiritual, family, belonging]            ││
│  │                                                                 ││
│  │ 4. Intent Validation                                            ││
│  │    - If similar_author but no valid author: → theme_search      ││
│  │    - If similar_book but no valid book: → theme_search          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Output: Validated extraction with verified entities                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: DETERMINISTIC ROUTING                                       │
│  ═══════════════════════════════════════════════════════════════════ │
│  Component: deterministicRouter.js                                   │
│  Method: Deterministic code (NO LLM)                                 │
│                                                                      │
│  Routing Table:                                                      │
│  ┌──────────────────┬────────────────────────────────────────────┐  │
│  │ Intent           │ Action                                     │  │
│  ├──────────────────┼────────────────────────────────────────────┤  │
│  │ similar_author   │ World search (Serper + Google Books API)   │  │
│  │ similar_book     │ Vector search with book's embedding        │  │
│  │ theme_search     │ Vector search with search_query            │  │
│  │ mood_search      │ Vector search with search_query            │  │
│  │ new_releases     │ Temporal path (Serper web search)          │  │
│  │ browse           │ Return curated theme collections           │  │
│  └──────────────────┴────────────────────────────────────────────┘  │
│                                                                      │
│  NO LLM involvement in routing decisions                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: DATA RETRIEVAL                                              │
│  ═══════════════════════════════════════════════════════════════════ │
│  Component: Various (vectorSearch.js, recommendationPaths.js)        │
│  Method: Deterministic code (NO LLM)                                 │
│                                                                      │
│  Data Sources:                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ CATALOG PATH                                                    ││
│  │ - Supabase books table (197 curated books)                      ││
│  │ - Vector similarity search via find_similar_books RPC           ││
│  │ - Author/genre/theme filters                                    ││
│  │                                                                 ││
│  │ TEMPORAL PATH                                                   ││
│  │ - Serper web search for new releases                            ││
│  │ - Google Books API for verification                             ││
│  │ - ISBN lookup for enrichment                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Output: Array of verified book objects with catalog_id if from DB   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: RESPONSE FORMATTING                                         │
│  ═══════════════════════════════════════════════════════════════════ │
│  Component: responseFormatter.js                                     │
│  Method: Claude Tool Use                                             │
│  Tool: format_recommendations                                        │
│  Temperature: 0                                                      │
│                                                                      │
│  Input: Verified book data from Step 4                               │
│  Output: Natural language response with structured recommendations   │
│                                                                      │
│  Constraints:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ - Claude MUST use provided book data                            ││
│  │ - Claude CANNOT add books not in input                          ││
│  │ - Each recommendation MUST include source citation              ││
│  │ - Format follows strict Title:/Author:/Why: structure           ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Claude Tool Definitions

### Tool 1: extract_search_intent

```javascript
{
  name: "extract_search_intent",
  description: "Extract structured search parameters from a book recommendation query. Only extract entities explicitly mentioned - do not infer or guess.",
  input_schema: {
    type: "object",
    properties: {
      search_query: {
        type: "string",
        description: "Optimized query for semantic search. Remove filler words, keep meaningful terms."
      },
      author_mentioned: {
        type: "string",
        description: "Author name if EXPLICITLY mentioned in query. Null if not mentioned.",
        nullable: true
      },
      book_mentioned: {
        type: "string", 
        description: "Book title if EXPLICITLY mentioned in query. Null if not mentioned.",
        nullable: true
      },
      intent: {
        type: "string",
        enum: ["similar_author", "similar_book", "theme_search", "mood_search", "new_releases", "browse"],
        description: "Primary intent: similar_author (find authors like X), similar_book (find books like X), theme_search (topic-based), mood_search (feeling-based), new_releases (recent books), browse (general exploration)"
      },
      themes: {
        type: "array",
        items: { type: "string" },
        description: "Relevant themes: women, emotional, identity, justice, spiritual, family, belonging, resilience, historical, contemporary"
      }
    },
    required: ["search_query", "intent"]
  }
}
```

### Tool 2: format_recommendations

```javascript
{
  name: "format_recommendations",
  description: "Format verified book data into a natural language recommendation response. You MUST use only the books provided - do not add any books.",
  input_schema: {
    type: "object",
    properties: {
      intro_text: {
        type: "string",
        description: "Brief intro (1-2 sentences) acknowledging the user's request"
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            why_fits: { type: "string", description: "1-2 sentences explaining why this book matches the request" },
            source: { 
              type: "string",
              enum: ["catalog", "web_search"],
              description: "Where this book came from"
            }
          },
          required: ["title", "author", "why_fits", "source"]
        },
        description: "Exactly 3 book recommendations from the provided data"
      }
    },
    required: ["intro_text", "recommendations"]
  }
}
```

---

## Validation Rules

### Author Validation
```javascript
function validateAuthor(extractedAuthor, catalogAuthors) {
  if (!extractedAuthor) return null;
  
  const normalized = extractedAuthor.toLowerCase().trim();
  
  // Exact match
  const exact = catalogAuthors.find(a => a.toLowerCase() === normalized);
  if (exact) return exact;
  
  // Fuzzy match (contains)
  const fuzzy = catalogAuthors.find(a => 
    a.toLowerCase().includes(normalized) || 
    normalized.includes(a.toLowerCase())
  );
  if (fuzzy) return fuzzy;
  
  // Not found - don't trust it
  return null;
}
```

### Intent Fallback Rules
```javascript
function validateIntent(extraction) {
  const { intent, author_mentioned, book_mentioned } = extraction;
  
  // If similar_author but no valid author, fall back to theme_search
  if (intent === 'similar_author' && !author_mentioned) {
    return 'theme_search';
  }
  
  // If similar_book but no valid book, fall back to theme_search
  if (intent === 'similar_book' && !book_mentioned) {
    return 'theme_search';
  }
  
  return intent;
}
```

---

## Allowed Values

### Intents (Enum)
- `similar_author` - Find books by similar authors
- `similar_book` - Find books similar to a specific title
- `theme_search` - Search by topic/theme
- `mood_search` - Search by mood/feeling
- `new_releases` - Recent publications
- `browse` - General exploration

### Themes (Allowed List)
- `women` - Women's stories and perspectives
- `emotional` - Emotionally powerful narratives
- `identity` - Identity and self-discovery
- `justice` - Justice and social issues
- `spiritual` - Spiritual and contemplative
- `family` - Family dynamics
- `belonging` - Belonging and community
- `resilience` - Resilience and survival
- `historical` - Historical fiction
- `contemporary` - Contemporary fiction

---

## Error Handling

### Extraction Failure
If Claude tool use fails or returns invalid data:
```javascript
const FALLBACK_EXTRACTION = {
  search_query: originalUserQuery,
  author_mentioned: null,
  book_mentioned: null,
  intent: 'theme_search',
  themes: []
};
```

### Validation Failure
If validation fails for all entities:
- Use original query for vector search
- Route to theme_search intent
- Log for monitoring

### Empty Results
If search returns no results:
- Try broader search with lower threshold
- If still empty, acknowledge and suggest browsing curated lists
- NEVER let Claude make up books

---

## Monitoring & Logging

### Key Metrics
- `query_extraction_success_rate` - % of queries successfully extracted
- `entity_validation_rate` - % of extracted entities that validate
- `intent_fallback_rate` - % of intents that required fallback
- `recommendation_source_distribution` - catalog vs web vs hybrid

### Log Format
```javascript
{
  timestamp: ISO8601,
  query: "user query",
  extraction: { ... },
  validation: { author_valid: bool, book_valid: bool },
  final_intent: "theme_search",
  route: "CATALOG",
  results_count: 3,
  latency_ms: 450
}
```

---

## Files to Create/Modify

### New Files
- `src/lib/queryExtractor.js` - Claude tool use for extraction
- `src/lib/entityValidator.js` - Validation logic
- `src/lib/responseFormatter.js` - Claude tool use for formatting

### Modified Files
- `src/lib/recommendationService.js` - Integrate new pipeline
- `src/lib/deterministicRouter.js` - Use validated intents

### Deprecated Files (To Remove)
- Complex embedding-based routing logic (replaced by tool use)
- Fallback hallucination paths
- Debug endpoints (after testing)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025 | Original deterministic router |
| 2.0 | 2026-01-09 | Claude tool use for extraction + validation layer |
