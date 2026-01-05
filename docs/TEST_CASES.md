# Sarah's Books - Test Cases

**Purpose:** Automated testing to find vulnerabilities in recommendation flow  
**Last Updated:** January 4, 2026

---

## Test Matrix

| Auth State | Query Type | Expected Path | Expected Behavior |
|------------|------------|---------------|-------------------|
| Signed Out | Theme Browse | CATALOG | Books from Sarah's collection |
| Signed Out | Open Discovery | WORLD | Claude's knowledge with honest framing |
| Signed Out | New Release | TEMPORAL | Web search for recent books |
| Signed Out | Specific Book | CATALOG/WORLD | Book details if known |
| Signed In | Theme Browse | CATALOG | Exclude user's read books |
| Signed In | Open Discovery | WORLD | Skip exclusion filter |
| Signed In | New Release | TEMPORAL | Web search, skip exclusion |
| Signed In | Specific Book | CATALOG/WORLD | Exclude if in user's queue |

---

## Test Cases by Query Type

### 1. CATALOG PATH - Theme Browse

**Trigger:** User clicks a curated theme filter

| Test ID | Query | Auth | Expected Result | Console Check |
|---------|-------|------|-----------------|---------------|
| CAT-01 | Click "Emotional Truth" theme | Out | 3 books from Sarah's collection | `[Router] theme_filter_selected` |
| CAT-02 | Click "Women's Stories" theme | Out | 3 books from Sarah's collection | `fastPath: true` |
| CAT-03 | Click any theme | In | 3 books NOT in user's queue | `Fast path: curated list` |
| CAT-04 | Click theme (all books read) | In | "Favorites worth revisiting" message | `allRead: true` |

**Validation:**
- [ ] Badge shows "From My Library"
- [ ] No "World Discovery" badge
- [ ] Books have Sarah's assessment/why text

---

### 2. WORLD PATH - Open Discovery

**Trigger:** Query outside Sarah's catalog, not temporal

| Test ID | Query | Auth | Expected Result | Console Check |
|---------|-------|------|-----------------|---------------|
| WLD-01 | "Venezuela historical fiction" | Out | Claude recommends Eva Luna, Doña Bárbara, etc. | `[Router] Final route: WORLD` |
| WLD-02 | "Best thriller novels" | Out | Claude's thriller recommendations | `[WorldPath] Delegating to Claude` |
| WLD-03 | "Venezuela historical fiction" | In | Same results, skip exclusion filter | `skipPostProcessing: worldPath` |
| WLD-04 | "Books about Japanese culture" | Out | Claude's knowledge-based recs | `OUTSIDE MY CURATED COLLECTION` |

**Validation:**
- [ ] Response starts with "This is outside my curated collection..."
- [ ] Badge shows "World Discovery"
- [ ] Books are relevant to query topic
- [ ] No "trouble finding books" error

---

### 3. TEMPORAL PATH - New Releases

**Trigger:** Query contains "new", "latest", "upcoming" + author/book

| Test ID | Query | Auth | Expected Result | Console Check |
|---------|-------|------|-----------------|---------------|
| TMP-01 | "New Paula McLain" | Out | "Skylark" (2024 novel) | `[Router] Pre-filter match: TEMPORAL - new_author_pattern` |
| TMP-02 | "Latest Kristin Hannah" | Out | Most recent Kristin Hannah book | `temporal_keyword` |
| TMP-03 | "New book by Colleen Hoover" | Out | Recent Hoover release | `new_author_pattern` |
| TMP-04 | "Best books of 2025" | Out | 2025 releases | `[TemporalPath] Starting temporal search` |
| TMP-05 | "Upcoming releases" | Out | Anticipated books | Web search triggered |

**Validation:**
- [ ] Web search is used (not Claude knowledge)
- [ ] Books are actually recent/new releases
- [ ] Author name correctly extracted from query
- [ ] Console shows `[TemporalPath]` logs

---

### 4. CATALOG PATH - Author/Similar Queries

**Trigger:** Query matches Sarah's catalog content

| Test ID | Query | Auth | Expected Result | Console Check |
|---------|-------|------|-----------------|---------------|
| SIM-01 | "Books like The Nightingale" | Out | Similar books from catalog first | `[Router] Final route: CATALOG` or `HYBRID` |
| SIM-02 | "Paula McLain books" | Out | Paula McLain from catalog if available | Check catalog results |
| SIM-03 | "Historical fiction" | Out | Sarah's historical fiction picks | Catalog search |

---

## Edge Cases - MUST TEST

| Test ID | Query | Issue Being Tested | Expected |
|---------|-------|--------------------|----------|
| EDGE-01 | "new paula mclain" (lowercase) | Case sensitivity | Routes to TEMPORAL |
| EDGE-02 | "NEW PAULA MCLAIN" (uppercase) | Case sensitivity | Routes to TEMPORAL |
| EDGE-03 | Empty message | Input validation | Graceful error |
| EDGE-04 | Very long query (500+ chars) | Input limits | Truncated/handled |
| EDGE-05 | Query with emoji | Special chars | Works normally |
| EDGE-06 | "I want to read X" (book in queue) | Exclusion | Different recommendation |
| EDGE-07 | SQL injection attempt | Security | Sanitized, no error |
| EDGE-08 | Prompt injection attempt | Security | Blocked by sanitization |

---

## Signed In Specific Tests

| Test ID | Scenario | Expected |
|---------|----------|----------|
| AUTH-01 | User has 50+ books in queue | All excluded from recommendations |
| AUTH-02 | User rated book 5 stars | Influences "similar" recommendations |
| AUTH-03 | User dismissed a book | Never recommended again |
| AUTH-04 | User has read all theme books | Shows "favorites worth revisiting" |

---

## Console Validation Patterns

### Successful CATALOG Path
```
[Router] theme_filter_selected (or catalog_keyword)
[App] Fast path response, skipping post-processing
```

### Successful WORLD Path
```
[Router] Final route: WORLD - low_alignment
[WorldPath] Using Claude knowledge for world recommendations
[WorldPath] Delegating to Claude knowledge
[App] Skipping post-processing for: worldPath
```

### Successful TEMPORAL Path
```
[Router] Pre-filter match: TEMPORAL - new_author_pattern
[TemporalPath] Starting temporal search
[TemporalPath] Found X books
```

### Error Patterns to Flag
```
"I'm having trouble finding books" → Post-processing filtered all results
"Vector dimension mismatch" → Embedding issue
"Request timed out" → API timeout
"Rate limit exceeded" → User hit daily limit
```

---

## Quick Smoke Test (5 queries)

Run these 5 queries to verify core functionality:

1. **Click "Emotional Truth" theme** → Should return catalog books
2. **"Venezuela historical fiction"** → Should use Claude knowledge
3. **"New Paula McLain"** → Should find Skylark via web search
4. **"Books like The Paris Wife"** → Should search catalog first
5. **"Best thriller novels"** → Should use Claude knowledge (outside taste)

---

## Regression Tests After Changes

After any code change, verify:

- [ ] Curated theme click returns catalog books
- [ ] Open discovery uses Claude knowledge
- [ ] New release queries use web search
- [ ] Signed-in users don't see books in their queue
- [ ] No "trouble finding books" errors on valid queries
- [ ] Console has no unexpected errors
- [ ] Response time < 10 seconds

---

## API Endpoints to Monitor

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/chat` | Claude calls | 200 with recommendations |
| `/api/web-search` | Serper search | 200 with results |
| `/api/embeddings` | OpenAI embeddings | 200 with vector |
| `/api/reference-embeddings` | Cached embeddings | 200 with data |

---

## Notes

- Always test both **signed out** and **signed in** states
- Clear browser cache between major test runs
- Check console for error patterns
- Response should always have 3 recommendations (never 0)
