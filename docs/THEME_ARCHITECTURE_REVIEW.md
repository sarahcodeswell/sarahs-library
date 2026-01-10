# Theme-Based Discovery Architecture Review

**Date:** January 10, 2026  
**Status:** Pending Review

## Current State (Fixed Tonight)

### What Works Now
1. **Curator themes in books.json** - All 197 books classified with themes: `women`, `beach`, `emotional`, `identity`, `spiritual`, `justice`
2. **Supabase synced** - Themes array updated for all books
3. **Theme browsing UI** - Users can click theme buttons in App.jsx
4. **Catalog search** - `getBooksByThemes()` queries Supabase correctly

### Theme Distribution
- emotional: 111 books
- women: 71 books  
- identity: 66 books
- justice: 63 books
- spiritual: 39 books
- beach: 8 books

---

## Architecture Gaps to Address

### Gap 1: World Discovery Using Theme Descriptions

**Problem:** When searching for books outside Sarah's catalog, we don't use the rich thematic descriptions to find similar books.

**Current Flow:**
```
User query → Route to WORLD path → Serper search → Google Books API → Format results
```

**Missing:** The thematic descriptions (e.g., "Books that excavate women's hidden contributions...") are NOT passed to the world search.

**Desired Flow:**
```
User query → Detect theme alignment → Augment search with theme description → 
Serper search with theme context → Filter/rank by theme fit → Format results
```

**Files to modify:**
- `src/lib/worldSearch.js` - Add theme-aware search
- `src/lib/deterministicRouter.js` - Pass theme context to world path
- `src/lib/recommendationServiceV2.js` - Include theme descriptions in context

### Gap 2: Finding Books with Same "Structure/Depth" Across Genres

**Problem:** Sarah wants to find books outside her usual themes that have the same *quality* of depth and emotional resonance.

**Example:** "Find me a sci-fi book that has the same emotional depth as my 'emotional truth' books"

**Approach Options:**

1. **Embedding-based taste matching**
   - Compute a "Sarah's taste centroid" embedding from her highest-rated books
   - When searching world, filter results by similarity to taste centroid
   - Already have `reference_embeddings` table with `sarahs_taste` centroid

2. **Claude-based taste filtering**
   - After retrieving world books, have Claude evaluate each for "Sarah alignment"
   - Use the rich theme descriptions as evaluation criteria
   - More expensive but more nuanced

3. **Hybrid approach**
   - Use embeddings for initial filtering (fast)
   - Use Claude for final ranking (accurate)

**Files to modify:**
- `src/lib/worldSearch.js` - Add taste filtering
- `src/lib/responseFormatter.js` - Include taste alignment in output
- New: `src/lib/tasteAlignment.js` - Taste matching utilities

### Gap 3: Theme Descriptions Not Used in Recommendations

**Problem:** The rich thematic descriptions on Meet Sarah page are display-only. They're not passed to Claude when generating recommendations.

**Current:** Claude sees theme keys like `["emotional", "women"]`

**Desired:** Claude sees full context:
```
Theme: Emotional Truth
Description: Books that explore the depths of the human experience—grief, joy, 
heartbreak, missed chances. The thrillers here are psychological rather than 
procedural. The romances grapple with real loss. Stories that cost something 
to read—that leave the reader changed.
```

**Files to modify:**
- `src/lib/constants.js` - Already has `themeDescriptions` but they're short
- `src/lib/recommendationService.js` - Pass full descriptions to Claude
- `src/lib/responseTemplates.js` - Include theme context in prompts

---

## Proposed Implementation Plan

### Phase 1: Enrich Theme Context (Quick Win)
1. Expand `themeDescriptions` in constants.js with full rich descriptions
2. Pass theme descriptions to Claude in recommendation prompts
3. Update response templates to include theme context

### Phase 2: Theme-Aware World Search
1. When routing to WORLD path, detect if query aligns with a theme
2. Augment Serper search query with theme keywords
3. Use theme description to help Claude evaluate world results

### Phase 3: Taste-Based Discovery
1. Implement taste alignment scoring using existing `sarahs_taste` centroid
2. Add "books like Sarah's taste but in [genre]" query type
3. Filter world results by taste similarity before presenting

---

## Questions for Sarah

1. **Beach reads count:** Only 8 books classified as beach reads. Should we be more generous with this tag, or is it accurate that most of your collection is emotionally weighty?

2. **Theme priority:** When a book has multiple themes (e.g., `["emotional", "women", "identity"]`), should the first one be considered "primary"? This affects how we route and display.

3. **World discovery scope:** When finding books outside your catalog, should we:
   - a) Only suggest books that match your themes (stay in lane)
   - b) Suggest books that match your *taste quality* even in different genres (expand horizons)
   - c) Both, based on query type

4. **Taste centroid:** Should we recompute the taste centroid now that themes are properly tagged? This would improve embedding-based matching.

---

## Related Files

- `src/lib/constants.js` - Theme definitions
- `src/lib/worldSearch.js` - World discovery
- `src/lib/deterministicRouter.js` - Query routing
- `src/lib/recommendationServiceV2.js` - Main recommendation flow
- `src/lib/vectorSearch.js` - Catalog search
- `scripts/classify-curator-themes.js` - Theme classification script
- `scripts/sync-themes-to-supabase.js` - Supabase sync script
