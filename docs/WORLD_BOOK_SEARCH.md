# World Book Search Feature

## Overview

This feature allows users to search for any book in the world (not just Sarah's catalog) and add it to their reading queue.

## User Flow

```
User clicks "I know what I want to read"
            │
            ▼
┌─────────────────────────────────────────┐
│  Search input appears                    │
│  User types book title or author         │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  World Book Search API                   │
│  (Open Library - free, no API key)       │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  Check if user already has this book     │
│  - In reading_queue (any status)?        │
│  - In user_books (collection)?           │
└─────────────────────────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
  Already       Not in
  have it       library
     │             │
     ▼             ▼
  Show badge:   Add to
  "In Queue"    Want to Read
  or "In        
  Collection"   
```

## Technical Implementation

### 1. API Endpoint: `/api/book-search`

Uses Open Library Search API (free, no key required):
- Endpoint: `https://openlibrary.org/search.json`
- Returns: title, author, cover, ISBN, first publish year

### 2. Frontend: `MyReadingQueuePage.jsx`

- Calls `/api/book-search` with debounced query
- Shows results with cover images
- Checks against user's existing books
- Adds to queue with proper metadata

### 3. Data Flow

```
Frontend                    API                     Open Library
   │                         │                           │
   │  POST /api/book-search  │                           │
   │  { query: "skylark" }   │                           │
   │ ───────────────────────>│                           │
   │                         │  GET /search.json?q=...   │
   │                         │ ─────────────────────────>│
   │                         │                           │
   │                         │  { docs: [...] }          │
   │                         │ <─────────────────────────│
   │                         │                           │
   │  { books: [...] }       │                           │
   │ <───────────────────────│                           │
   │                         │                           │
```

## Separation from Recommendations

This feature is **completely separate** from the recommendations algorithm:

| Feature | Purpose | Data Source |
|---------|---------|-------------|
| **World Book Search** | Find specific book user already knows | Open Library API |
| **Recommendations** | Discover new books based on taste | Sarah's catalog + Claude |

The recommendations system remains untouched:
- `lib/deterministicRouter.js` - Routes queries to appropriate path
- `lib/recommendationPaths.js` - Executes catalog/world/hybrid/temporal searches
- `lib/recommendationService.js` - Orchestrates the full recommendation flow

## Implementation Date

January 9, 2026
