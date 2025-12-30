# Sarah's Library - Architecture Analysis & Recommendations

## Current Database Architecture

### Existing Tables

#### 1. **user_books** (Add Books / Staging Area)
- **Purpose**: Temporary staging for books added via photo/manual entry
- **Schema**: 
  - `user_id`, `book_title`, `book_author`, `isbn`, `cover_image_url`
  - `added_via` (photo/manual/import)
  - `notes`, `added_at`, `updated_at`
- **Current Flow**: Books added here, then moved to reading_queue when user takes action
- **Status**: ✅ Matches proposed architecture

#### 2. **reading_queue** (Combined Reading Queue + Collection)
- **Purpose**: User's books with status tracking
- **Schema**:
  - `user_id`, `book_title`, `book_author`
  - `status` ('want_to_read', 'reading', 'finished')
  - `rating` (1-5 stars, nullable)
  - `added_at`, `updated_at`
- **Current Flow**: 
  - 'want_to_read' / 'reading' = Reading Queue
  - 'finished' = User's Collection
- **Issue**: ⚠️ Single table serving two purposes (queue + collection)

#### 3. **books.json** (Sarah's Curated Collection)
- **Purpose**: Static file with 199 curated books
- **Schema**: `title`, `author`, `genre`, `themes[]`, `favorite`, `description`, `goodreads`
- **Current Flow**: Used as context for AI recommendations
- **Status**: ✅ Matches proposed architecture

#### 4. **user_exclusion_list** (Materialized View)
- **Purpose**: Pre-computed exclusion list for recommendations
- **Schema**: Combines `reading_queue` + `dismissed_recommendations`
- **Current Flow**: Fetched but NOT sent to AI (found the bug!)
- **Issue**: ⚠️ Created but not utilized in recommendation flow

#### 5. **taste_profiles** (User Preferences)
- **Purpose**: Stores liked books, themes, authors
- **Schema**: `user_id`, `liked_books` (JSONB), `liked_themes[]`, `liked_authors[]`
- **Status**: Exists but underutilized

#### 6. **user_recommendations** (User-to-User Recommendations)
- **Purpose**: Users recommending books to friends
- **Schema**: `user_id`, `book_title`, `book_author`, `recommendation_note`
- **Status**: Feature exists but separate from AI recommendations

#### 7. **dismissed_recommendations** (Referenced but NOT CREATED)
- **Purpose**: Track books user dismissed with "Not For Me"
- **Schema**: Unknown - table doesn't exist yet!
- **Issue**: ❌ Referenced in materialized view but never created

---

## Current Recommendation Algorithm Flow

### Step 1: Data Gathering
```javascript
// App.jsx line 1395-1398
const systemPrompt = buildCachedSystemPrompt({
  readingQueue,  // All user's books (want_to_read, reading, finished)
  currentYear: CURRENT_YEAR
});
```

### Step 2: System Prompt Construction (promptCache.js)
```javascript
// Filters reading queue into:
- finishedBooks (status === 'finished')
  - Categorized by rating: loved (5★), liked (4★), okay (3★), disliked (1-2★)
- queuedBooks (status === 'want_to_read' OR 'reading')

// Adds to system prompt:
- "BOOKS USER LOVED (5 stars)" - use for recommendations
- "BOOKS USER LIKED (4 stars)" - use for recommendations  
- "BOOKS USER DISLIKED (1-2 stars)" - avoid similar
- "CRITICAL EXCLUSION - BOOKS USER HAS ALREADY READ" - NEVER recommend
- "BOOKS USER HAS ALREADY SAVED TO READING QUEUE" - DO NOT recommend
```

### Step 3: Library Context (CURRENTLY DISABLED)
```javascript
// App.jsx line 1863
const libraryShortlist = buildOptimizedLibraryContext(
  userMessage, 
  bookCatalog,      // books.json (199 books)
  readingQueue,     // For exclusion filtering
  favoriteAuthors,
  10
);

// semanticSearch.js - filters books.json:
- Excludes books in reading_queue (by normalized title)
- Scores remaining books by query match
- Returns top 10 matches

// PROBLEM: Currently commented out (line 1896-1901)
// AI was prioritizing library context over exclusion rules
```

### Step 4: User Message Construction
```javascript
// App.jsx line 1876-1911
const parts = [
  "USER'S TASTE PROFILE" (themes, genres, authors from finished books),
  // "MY LIBRARY SHORTLIST" - DISABLED
  "USER'S OWNED BOOKS" (from imported library),
  "ACTIVE THEME FILTERS" (if any),
  "USER REQUEST"
];
```

### Step 5: AI Call
```javascript
// App.jsx line 1917-1930
fetch('/api/chat', {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 600,
  system: systemPrompt,  // Contains exclusion lists
  messages: [
    ...chatHistory,
    { role: 'user', content: userContent }
  ]
});
```

### Step 6: Post-Processing
- AI returns 3 book recommendations
- Parsed and displayed as recommendation cards
- User can: Already Read, Want to Read, Not For Me

---

## Problems Identified

### 🔴 Critical Issues

1. **Library Context Disabled**
   - Root cause: AI ignoring exclusion rules when library context present
   - Current fix: Completely disabled library shortlist
   - Impact: No recommendations from Sarah's curated 199 books

2. **dismissed_recommendations Table Missing**
   - Referenced in materialized view but never created
   - "Not For Me" dismissals not being tracked
   - Exclusion list incomplete

3. **user_exclusion_list Not Used**
   - Materialized view created and populated
   - Fetched in App.jsx (line 1829-1834)
   - But NEVER sent to AI prompt
   - Wasted database query

4. **Title Normalization Inconsistency**
   - Fixed in semanticSearch.js but may have edge cases
   - Different normalization in different parts of codebase
   - Causes exclusion filtering to fail

### 🟡 Architecture Issues

1. **reading_queue Serves Dual Purpose**
   - Combines "Reading Queue" and "My Collection"
   - Status field differentiates but conceptually unclear
   - Hard to query "just my reading queue" vs "just my collection"

2. **No Centralized Exclusion Logic**
   - Exclusion handled in 3 places:
     - System prompt (promptCache.js)
     - Library search (semanticSearch.js)
     - Materialized view (user_exclusion_list) - unused
   - Prone to inconsistencies

3. **books.json is Static File**
   - Not in database, can't query efficiently
   - Can't track which books are from Sarah's collection in recommendations
   - Can't add more curated books without code deploy

---

## Proposed Architecture (Your Vision)

### Table Structure

```
1. user_books (Add Books - Staging)
   ├─ Photo/manual entry lands here
   └─ User decides: Read → My Collection, Want to Read → Reading Queue

2. reading_queue (My Reading Queue)
   ├─ Books user wants to read
   └─ Status: 'want_to_read', 'reading'

3. user_collection (My Collection) 
   ├─ Books user has read
   ├─ Includes rating, notes
   └─ Separate from reading queue

4. sarahs_collection (Master Catalog)
   ├─ Your 199 curated books
   ├─ Powers recommendations for ALL users
   └─ In database, not static file

5. books_to_exclude (Exclusion List)
   ├─ Combines: user_books + reading_queue + user_collection
   ├─ Single source of truth for exclusions
   └─ Fast lookup for recommendations
```

### Recommendation Flow

```
1. User asks for recommendation
2. Claude searches world library for best matches
3. Query books_to_exclude for user
4. Filter out excluded books
5. Return top 3 recommendations
```

---

## Expert Recommendations

### ✅ What You Got Right

1. **Separation of Concerns**: Staging → Queue → Collection is clean
2. **Exclusion List**: Single table for fast exclusion lookups is smart
3. **Sarah's Collection as Seed Data**: Using curated books to train recommendations is excellent

### 🎯 Suggested Architecture (Optimized)

#### Option A: Keep It Simple (Recommended)

**Tables:**
1. **user_books** (staging) - ✅ Keep as-is
2. **reading_queue** (want_to_read, reading, finished) - ✅ Keep as-is
   - Rename to `user_library` for clarity
   - Status differentiates queue vs collection
3. **sarahs_collection** (database table, not JSON)
   - Migrate books.json to database
   - Allows efficient querying and expansion
4. **user_exclusion_list** (materialized view) - ✅ Keep as-is
   - Actually USE it in recommendations
   - Add dismissed_recommendations table to feed it

**Why This Works:**
- Minimal migration (mostly renaming/clarifying)
- reading_queue already has all the data
- Materialized view handles performance
- Single query for exclusions

#### Option B: Full Separation (Your Vision)

**Tables:**
1. **user_books** (staging)
2. **reading_queue** (want_to_read, reading only)
3. **user_collection** (finished books with ratings)
4. **sarahs_collection** (curated books)
5. **books_to_exclude** (materialized view of 1+2+3)

**Why This Works:**
- Clearer conceptual model
- Easier to query "just reading queue" or "just collection"
- Better for future features (e.g., collection sharing)

**Tradeoffs:**
- Requires data migration from reading_queue
- More tables to maintain
- Need to update all queries

### 🚀 My Recommendation: **Hybrid Approach**

**Phase 1: Fix Current Issues (Quick Wins)**
1. Create `dismissed_recommendations` table
2. Actually USE `user_exclusion_list` in AI prompt
3. Migrate `books.json` → `sarahs_collection` table
4. Re-enable library context with proper exclusion

**Phase 2: Optimize Architecture (Next Sprint)**
1. Split `reading_queue` → `reading_queue` + `user_collection`
2. Migrate existing 'finished' books to new table
3. Update all queries and UI
4. Rename `user_exclusion_list` → `books_to_exclude`

**Phase 3: Scale (Future)**
1. Add more curated collections (not just Sarah's)
2. Collaborative filtering (users who liked X also liked Y)
3. Embedding-based semantic search

---

## Performance Considerations

### Current Bottleneck
- Fetching `user_exclusion_list` but not using it
- Building exclusion list in JavaScript (slow)
- AI receiving huge exclusion lists in system prompt

### Solution
```sql
-- Fast exclusion check (< 10ms)
SELECT book_title 
FROM user_exclusion_list 
WHERE user_id = $1;

-- Use this to filter AI recommendations AFTER generation
-- OR send to AI as compact exclusion list
```

### Query Optimization
```sql
-- Instead of 3 queries (user_books, reading_queue, dismissed)
-- Use materialized view (1 query)
SELECT book_title FROM books_to_exclude WHERE user_id = $1;
```

---

## Implementation Plan

### Immediate Fixes (This Session)
1. ✅ Create `dismissed_recommendations` table
2. ✅ Use `user_exclusion_list` in recommendation flow
3. ✅ Fix title normalization consistency
4. ✅ Test exclusion logic end-to-end

### Next Session
1. Migrate `books.json` → `sarahs_collection` table
2. Re-enable library context with proper filtering
3. Add debug logging for exclusion checks

### Future Refactor
1. Split `reading_queue` into queue + collection
2. Implement collaborative filtering
3. Add recommendation explanation ("Why this book?")

---

## Conclusion

**Your architecture vision is solid.** The main issue isn't the design—it's that the current implementation has:
1. Incomplete features (missing tables)
2. Unused optimizations (exclusion list not utilized)
3. Workarounds (library context disabled)

**Best path forward:**
- Fix immediate bugs (create missing tables, use exclusion list)
- Keep current table structure for now (it's 80% there)
- Plan gradual migration to cleaner separation

**The recommendation algorithm should be:**
```
1. User asks for books
2. Claude generates candidates from world library
3. Query user_exclusion_list (single fast query)
4. Filter out excluded books
5. Return top 3 recommendations
```

This is exactly what you described, and it's the right approach. We just need to wire it up correctly.
