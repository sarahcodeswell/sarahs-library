# V2 Recommendation System - Implementation Learnings

**Date**: January 9, 2026  
**Status**: Production  

---

## Executive Summary

We refactored the recommendation system from a complex, hallucination-prone architecture to a clean, deterministic system using Claude Tool Use. The key insight: **Claude should be a "translator" not a "decider"**.

---

## Key Architectural Decisions

### 1. Claude Tool Use for Constrained Extraction

**Problem**: Free-form Claude responses led to hallucinations (invented authors, wrong book details).

**Solution**: Use Claude's Tool Use feature with constrained schemas:
- Enum-limited intents prevent invented values
- Required fields guarantee structure
- Temperature 0 for deterministic output

```javascript
tools: [{
  name: "extract_search_intent",
  input_schema: {
    properties: {
      intent: {
        type: "string",
        enum: ["similar_author", "similar_book", "theme_search", ...]
      }
    }
  }
}]
```

### 2. Entity Validation Layer

**Problem**: Claude might extract author/book names that don't exist in catalog.

**Solution**: Deterministic validation against catalog data:
- Fuzzy match extracted entities against known authors/titles
- If not found, nullify the entity and adjust intent
- Never trust unverified entities

### 3. World Search for Discovery

**Problem**: `similar_author` intent was searching only the 197-book catalog, returning empty results for users who had read most books.

**Solution**: Use web search (Serper) + Google Books API for world discovery:
- Search web for "authors similar to [author]"
- Extract author names from results
- Verify books via Google Books API
- Return grounded, verifiable recommendations

### 4. Separation of Concerns

| Component | Role | LLM Involvement |
|-----------|------|-----------------|
| Query Extraction | Parse user intent | Claude Tool Use |
| Entity Validation | Verify against catalog | None |
| Routing | Decide search path | None |
| Data Retrieval | Fetch books | None |
| Response Formatting | Format results | Claude Tool Use |

---

## Bugs Fixed

### 1. Hallucinated Authors
- **Symptom**: "The Nightingale by Lilac Barak" (wrong author)
- **Root Cause**: RLS policy blocked anonymous access to books table, vector search failed, Claude fell back to hallucinating
- **Fix**: Fixed RLS policies, added safety fallback to prevent hallucination

### 2. Low Vector Similarity Scores
- **Symptom**: Text queries returning 0.41 similarity (below threshold)
- **Root Cause**: Text-to-book similarity is inherently lower than book-to-book
- **Learning**: Don't lower thresholds blindly - use query preprocessing instead

### 3. All Results Filtered Out
- **Symptom**: "Retrieved 0 books" for signed-in users
- **Root Cause**: User had 205 books in exclusion list, all results filtered
- **Fix**: Fallback to show unfiltered results if filtering removes everything

### 4. similar_author Returning Same Author's Books
- **Symptom**: "Who else should I read" returned Kristin Hannah's own books
- **Root Cause**: Misnamed intent - was finding books BY author, not SIMILAR authors
- **Fix**: Changed to world search for similar authors

---

## Security Improvements

1. **Removed debug endpoint** (`api/debug-db.js`) - exposed database structure
2. **Added retry logic** with exponential backoff for API resilience
3. **Constrained Claude outputs** - can't invent intents or bypass routing

---

## Performance Considerations

- V2 makes 2 Claude API calls (extraction + formatting) vs V1's 1
- Added retry logic (2 retries with exponential backoff)
- World search adds latency for `similar_author` intent

---

## Files Created/Modified

### New Files
- `src/lib/queryExtractor.js` - Claude Tool Use for intent extraction
- `src/lib/entityValidator.js` - Validates entities against catalog
- `src/lib/responseFormatter.js` - Claude Tool Use for formatting
- `src/lib/recommendationServiceV2.js` - Clean V2 pipeline
- `src/lib/worldSearch.js` - Serper + Google Books for world discovery
- `docs/RECOMMENDATION_ARCHITECTURE_V2.md` - Architecture specification

### Modified Files
- `src/App.jsx` - Uses V2 exclusively now
- `docs/V2_IMPLEMENTATION_LEARNINGS.md` - This document

### Deprecated (Retained for Reference)
- `src/lib/recommendationService.js` - V1 code, no longer called

---

## Configuration Required

### Vercel Environment Variables
```
VITE_SENTRY_DSN=<your-sentry-dsn>  # For error monitoring
SERPER_API_KEY=<your-serper-key>   # For web search
```

---

## Testing Checklist

- [ ] Signed out: "I like Kristin Hannah" → Returns similar authors from world
- [ ] Signed in: Same query → Works with exclusion filtering
- [ ] Theme search: "mystery books" → Returns catalog books
- [ ] New releases: "new Paula McLain" → Uses temporal path
- [ ] Browse: "show me what you have" → Returns curated collections

---

## Lessons Learned

1. **Don't patch symptoms** - When seeing low similarity scores, the fix wasn't lowering thresholds but improving query preprocessing.

2. **Claude Tool Use > Free-form prompting** - Constrained schemas prevent hallucination better than prompt engineering.

3. **Validate everything** - Never trust extracted entities without verification against known data.

4. **World search for discovery** - A 197-book catalog can't serve all discovery needs. Use web search for broader recommendations.

5. **Debug endpoints are security risks** - Remove before production or add authentication.

6. **RLS policies are tricky** - A single `FOR ALL` policy can break anonymous access. Test both auth states.

---

## Future Improvements

1. **Cache common extractions** - "mystery books" always extracts the same way
2. **Add monitoring dashboard** - Track intent distribution, success rates
3. **A/B test V1 vs V2** - Measure recommendation quality
4. **Remove V1 code entirely** - After extended production testing
