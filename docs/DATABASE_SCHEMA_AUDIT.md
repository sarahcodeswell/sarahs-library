# Database Schema Audit for Sarah's Books

**Date:** January 4, 2026  
**Purpose:** Document current schema and identify gaps for deterministic routing

---

## Current Tables

### 1. `books` (Sarah's Catalog - ~197 books)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Book title |
| `author` | TEXT | Author name |
| `description` | TEXT | Book description |
| `themes` | TEXT[] | Array of themes: `['women', 'emotional', 'identity', 'spiritual', 'justice']` |
| `genre` | TEXT | Genre (Literary Fiction, Memoir, etc.) |
| `sarah_assessment` | TEXT | Sarah's personal assessment |
| `embedding` | vector(1536) | OpenAI embedding for similarity search |
| `isbn13` | TEXT | ISBN-13 identifier |
| `isbn10` | TEXT | ISBN-10 identifier |
| `cover_url` | TEXT | Cover image URL |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

**Functions:**
- `find_similar_books(query_embedding, limit, threshold)` - Vector similarity search
- `find_books_by_genre(genre_filter, limit)` - Genre search
- `find_books_by_author(author_filter, limit)` - Author search
- `find_book_by_isbn(isbn13)` - Exact ISBN lookup

---

### 2. `reading_queue` (User's Saved Books)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `book_title` | TEXT | Book title |
| `book_author` | TEXT | Author name |
| `status` | TEXT | 'want_to_read', 'reading', 'finished' |
| `rating` | INT | User rating (1-5) |
| `description` | TEXT | Book description |
| `embedding` | vector(1536) | Embedding for user's book |
| `genres` | TEXT[] | Genre tags |
| `themes` | TEXT[] | Theme tags |
| `subjects` | TEXT[] | Subject tags |
| `added_via` | TEXT | How book was added |
| `added_at` | TIMESTAMPTZ | When added |
| `updated_at` | TIMESTAMPTZ | Last updated |

**Functions:**
- `find_similar_user_books(query_embedding, user_id, limit, threshold)` - Search user's collection

---

### 3. `user_books` (User's Physical Collection)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `book_title` | TEXT | Book title |
| `book_author` | TEXT | Author name |
| `isbn` | TEXT | ISBN |
| `cover_image_url` | TEXT | Cover URL |
| `added_via` | TEXT | 'photo', 'manual', 'import' |
| `notes` | TEXT | User notes |
| `added_at` | TIMESTAMPTZ | When added |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

### 4. `dismissed_recommendations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `book_title` | TEXT | Dismissed book title |
| `book_author` | TEXT | Author |
| `dismissed_at` | TIMESTAMPTZ | When dismissed |

---

### 5. `taste_profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `liked_books` | JSONB | Array of liked books |
| `liked_themes` | TEXT[] | Preferred themes |
| `liked_authors` | TEXT[] | Preferred authors |
| `created_at` | TIMESTAMPTZ | Created |
| `updated_at` | TIMESTAMPTZ | Updated |

---

### 6. `recommendation_outcomes` (Learning Data)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `recommended_isbn` | TEXT | ISBN of recommended book |
| `recommended_title` | TEXT | Title |
| `recommended_author` | TEXT | Author |
| `source` | TEXT | 'ai', 'vector', 'popular' |
| `action` | TEXT | 'saved', 'dismissed', 'clicked' |
| `created_at` | TIMESTAMPTZ | When recorded |

---

### 7. Analytics Tables

- `user_events` - General event tracking
- `book_interactions` - Save, expand, click tracking
- `search_queries` - Search query logging
- `theme_interactions` - Theme filter usage
- `user_sessions` - Session tracking

---

### 8. Views

- `user_exclusion_list` (Materialized) - Combined list of books user has read/saved/dismissed

---

## GAPS for Deterministic Router

### Missing: `reference_embeddings` Table

The deterministic router needs pre-computed reference embeddings for:
- Sarah's taste centroid (average of all book embeddings)
- Theme centroids (average embedding per theme)
- Genre centroids (average embedding per genre)
- Anti-pattern embeddings (escapism, plot-over-character, formulaic)

**Proposed Schema:**
```sql
CREATE TABLE reference_embeddings (
  id TEXT PRIMARY KEY,
  reference_type TEXT NOT NULL, -- 'taste_centroid', 'theme', 'genre', 'anti_pattern'
  reference_name TEXT NOT NULL, -- 'sarahs_taste', 'women', 'literary_fiction', etc.
  embedding vector(1536) NOT NULL,
  source_book_count INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Missing: Quality Markers on `books` Table

The spec calls for quality assessment columns:
- `prose_quality` (1-5)
- `structure_quality` (1-5)
- `emotional_depth` (1-5)
- `thematic_coherence` (1-5)

These are optional for Phase 1 but needed for full quality framework.

---

## CRITICAL ISSUE: `themes` Column Data

The `books.themes` column EXISTS in the schema but may not be populated in the actual database.

**Source JSON has themes:**
```json
{
  "title": "Life After Life",
  "themes": ["women", "emotional"]
}
```

**Need to verify:**
1. Is the `themes` column populated in Supabase?
2. If not, run a migration to populate from source data

---

## Recommended Migrations

### Migration 021: Reference Embeddings Table ✅ CREATED
Creates table for storing pre-computed reference embeddings.
- File: `supabase/migrations/021_reference_embeddings.sql`
- Includes SQL functions to compute centroids from books table

### Migration 022: Populate Themes (if needed)
Updates books table with themes from source JSON.
- May not be needed if `generate-embeddings.js` was run recently

### Migration 023: Quality Markers (optional)
Adds quality assessment columns to books table.

---

## Setup Instructions

### Step 1: Run the migration
```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/021_reference_embeddings.sql
```

### Step 2: Compute reference embeddings
```bash
cd sarahs-library
node scripts/compute-reference-embeddings.js
```

### Step 3: Verify
The script will output:
- Books table status (total, with embeddings, with themes)
- Theme distribution
- All stored reference embeddings

---

## Data Flow for Deterministic Router

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│ Stage 1: Keyword Pre-filter         │
│ (No DB access needed)               │
└─────────────────────────────────────┘
    │
    ▼ (if no keyword match)
┌─────────────────────────────────────┐
│ Stage 2: Embedding Scoring          │
│ REQUIRES: reference_embeddings      │
│ - Query embedding vs taste centroid │
│ - Query embedding vs anti-patterns  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Stage 3: Decision Matrix            │
│ (Hard thresholds, no DB)            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Path Execution                      │
│ CATALOG: books table (themes, etc.) │
│ WORLD: web search + LLM extraction  │
│ TEMPORAL: web search + enrichment   │
└─────────────────────────────────────┘
```
