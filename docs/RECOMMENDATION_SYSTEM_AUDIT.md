# Recommendation System Audit
**Date:** January 4, 2026  
**Status:** In Progress

## Executive Summary

The recommendation system has accumulated technical debt through iterative fixes. This audit identifies root causes and proposes a systematic fix plan.

---

## 1. CRITICAL ISSUES IDENTIFIED

### 1.1 API Failures (from console logs)
```
❌ Failed to load /api/reference-embeddings - 500 error
❌ Failed to load /api/embeddings - 500 error  
❌ Vector search failed
```

**Root Cause:** Reference embeddings API returns 500, likely because:
- `reference_embeddings` table doesn't exist (migration not run)
- Or table is empty (compute script not run)

**Impact:** Falls back to keyword-only routing, which defaults most queries to HYBRID path.

### 1.2 Wrong Path Selection
Query: "book about Venezuela's history from a female perspective"
- **Expected:** WORLD path (specific topic outside Sarah's catalog)
- **Actual:** HYBRID path (fallback due to embedding failure)
- **Result:** Shows "Cloud Cuckoo Land" - completely wrong recommendation

### 1.3 UX Inconsistencies
- Shows "Searching world's library..." for curated list requests
- Shows loading states that don't match actual operations
- Badge system works but recommendations don't match badges

### 1.4 Catalog Path Returns 0 Books
```
[CatalogPath] Found 0 books
```
Even for queries that should match catalog, vector search fails.

---

## 2. ARCHITECTURE REVIEW

### 2.1 Intended Flow (from spec)
```
User Query
    ↓
┌─────────────────────────────────────┐
│ DETERMINISTIC ROUTER (3 stages)     │
│ 1. Keyword pre-filter               │
│ 2. Embedding similarity scoring     │
│ 3. Decision matrix                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ PATH EXECUTION                      │
│ - CATALOG: Vector search + themes   │
│ - WORLD: Web search + LLM extract   │
│ - HYBRID: Both with sections        │
│ - TEMPORAL: Web search for new      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ RESPONSE GENERATION                 │
│ - Claude formats recommendations    │
│ - OR fast path for curated lists    │
└─────────────────────────────────────┘
    ↓
UI Rendering (parseRecommendations)
```

### 2.2 Actual Flow (broken)
```
User Query
    ↓
Router tries to load embeddings → FAILS (500)
    ↓
Falls back to keyword-only routing
    ↓
Most queries → HYBRID (default fallback)
    ↓
HYBRID tries catalog search → FAILS (vector search broken)
    ↓
HYBRID tries world search → Works but wrong context
    ↓
Claude gets wrong/incomplete context
    ↓
Bad recommendations
```

---

## 3. DATABASE STATUS

### 3.1 Tables Required
| Table | Status | Notes |
|-------|--------|-------|
| books | ✅ Exists | 200+ books with embeddings |
| book_embeddings | ✅ Exists | Embeddings stored |
| reference_embeddings | ❓ Unknown | Migration 021 created? |
| users | ✅ Exists | Auth working |
| user_exclusion_list | ✅ Exists | Working |

### 3.2 Migrations Status
- `012_enable_pgvector.sql` - Books table, RLS
- `021_reference_embeddings.sql` - Reference embeddings table
- `022_fix_books_rls_public_read.sql` - RLS fix

**Question:** Have migrations 021 and 022 been applied?

### 3.3 RLS Policies
- Books: Should be public read
- User tables: Should be authenticated only

---

## 4. API ENDPOINTS STATUS

| Endpoint | Status | Issue |
|----------|--------|-------|
| /api/chat | ✅ Works | Claude API |
| /api/web-search | ✅ Works | Serper API |
| /api/embeddings | ❌ 500 | Needs investigation |
| /api/reference-embeddings | ❌ 500 | Table missing or empty |
| /api/analytics | ✅ Works | Logging |

---

## 5. UX ISSUES

### 5.1 Loading States
Current loading messages don't match operations:
- "Searching Sarah's collection..." - Shows for all queries
- "Searching world's library..." - Shows even for curated lists

**Fix:** Loading state should reflect actual path being executed.

### 5.2 Badge Accuracy
- "From My Library" badge requires exact title match in CATALOG_TITLE_INDEX
- If Claude recommends a book with slightly different title, badge is wrong

### 5.3 Error Handling
- API failures silently fall back to worse behavior
- User sees wrong recommendations with no indication of degraded service

---

## 6. SECURITY REVIEW

### 6.1 API Keys
- ✅ ANTHROPIC_API_KEY - Server-side only
- ✅ OPENAI_API_KEY - Server-side only
- ✅ SERPER_API_KEY - Server-side only
- ✅ SUPABASE_SERVICE_ROLE_KEY - Server-side only
- ✅ VITE_SUPABASE_URL - Public (expected)
- ✅ VITE_SUPABASE_ANON_KEY - Public (expected)

### 6.2 RLS Policies
- Books: Public read ✅
- User data: Authenticated only ✅
- Exclusion list: User-specific ✅

### 6.3 Rate Limiting
- Basic rate limiting in embeddings API
- No rate limiting on chat API (relies on Anthropic's limits)

---

## 7. PERFORMANCE ISSUES

### 7.1 Unnecessary API Calls
- Embedding generation attempted even when it will fail
- World search runs even for catalog-only queries (before fast path fix)

### 7.2 Missing Caching
- Reference embeddings should be cached (implemented but API fails)
- Query embeddings could be cached for repeated queries

### 7.3 Cold Start
- First request loads all reference embeddings
- Could pre-warm on app load

---

## 8. PRIORITIZED FIX PLAN

### Phase 1: Critical Fixes (Do First)
1. **Fix /api/reference-embeddings**
   - Check if table exists
   - Check if data is populated
   - Fix 500 error

2. **Fix /api/embeddings**
   - Investigate 500 error
   - Ensure OpenAI API key is set

3. **Fix vector search**
   - Verify book embeddings exist
   - Test similarity search function

### Phase 2: Routing Fixes
4. **Improve fallback routing**
   - Better keyword detection for WORLD path
   - "Venezuela history female perspective" should → WORLD

5. **Fix HYBRID path logic**
   - Don't show catalog results if none found
   - Better world search query construction

### Phase 3: UX Fixes
6. **Fix loading states**
   - Pass path info to UI
   - Show accurate loading messages

7. **Add error indicators**
   - Show degraded mode warning
   - Log failures visibly in dev

### Phase 4: Polish
8. **Performance optimization**
   - Pre-warm embeddings cache
   - Reduce unnecessary API calls

9. **Add monitoring**
   - Track routing decisions
   - Track recommendation quality

---

## 9. IMMEDIATE NEXT STEPS

1. Check Supabase dashboard for `reference_embeddings` table
2. Run migration 021 if not applied
3. Run `compute-reference-embeddings.js` script
4. Test /api/reference-embeddings endpoint
5. Test /api/embeddings endpoint
6. Verify vector search works

---

## 10. TESTING CHECKLIST

After fixes, test these scenarios:

| Query | Expected Path | Expected Result |
|-------|---------------|-----------------|
| Click "Women's Stories" theme | CATALOG fast path | 3 catalog books |
| "Venezuela history female" | WORLD | Web search results |
| "Something like The Great Alone" | CATALOG/HYBRID | Similar catalog books |
| "New Colleen Hoover book" | TEMPORAL | Latest release |
| "Best thriller" | WORLD | Web search for thrillers |
| "Emotional family drama" | CATALOG | Catalog books matching |

