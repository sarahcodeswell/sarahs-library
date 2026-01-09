# Sarah's Books - Changelog

## [Unreleased]

### January 9, 2026

#### Reading Queue Redesign (Demo-Ready)

**Complete Status Flow:**
```
Want to Read → Currently Reading → Finished?
    │               │                 │
    │               │          ┌──────┴──────┐
    │               │         Yes           No
    │               │          │             │
    │               │     [Rate/Review]   "Finished, not for me"
    │               │          │             │
    │               │     Collection    dismissed_recommendations
    │               │                   + status='finished'
    │               │
    └───────────────┴──► "Not for me" (dismissed, didn't finish)
```

**Data Signals (richest to weakest):**
1. Added to Collection = loved it, would recommend (strongest positive)
2. Finished, not in collection = read but wouldn't recommend (negative signal)
3. Not for me (didn't finish) = dismissed (negative signal)
4. Currently Reading = engaged
5. Want to Read = interested (weakest signal)

**Currently Reading:**
- Sortable with drag handles and numbered positions
- Rich cards with auto-enriched covers, genres, descriptions
- "Finished" button → modal asks "Add to collection?"
  - Yes → rating + review step → adds to `user_books`
  - No → marks as finished + adds to `dismissed_recommendations`
- "← Want to Read" moves back
- "Not for me" dismisses (adds to `dismissed_recommendations`)

**Want to Read:**
- "Get It ▼" expands purchase options (Bookshop, Libro.fm, Library, Amazon)
- "Start Reading" (sage green, on-brand) → moves to Currently Reading
- "Not for me" dismisses
- Ownership toggle tracks if user owns the book

**Collection Preview:**
- Shows at bottom of Reading Queue page
- Horizontal scroll of cover thumbnails with ratings
- "View All →" links to full collection

**Database Changes:**
- Migration 046: Added `review` TEXT column to `user_books`

#### Backend Health & Cleanup
- **Schema fix**: Added `reputation` column to `reading_queue` (migration 045)
- **Removed dead code**: Empty migration file (024), unused constants
- **Console.log cleanup**: Wrapped 40+ debug logs in `import.meta.env.DEV` guards
- **Security audit**: Passed - 0 npm vulnerabilities, RLS policies verified
- **Code quality**: ESLint warnings reduced, no errors

#### Documentation
- Created `CHANGELOG.md` for daily work tracking
- Created `docs/DEMO_CHECKLIST.md` for Otis meeting prep

#### Database Schema
- 21 tables, all with RLS enabled
- `reading_queue.is_active` column live (On My Nightstand vs On Deck)
- `reading_queue.reputation` column added

---

### January 8, 2026

#### Admin Dashboard - Currently Reading
- Added "Currently Reading" stat tile (separate from "Books Queued")
- Drill-down modal: user list → book list navigation
- New API endpoint: `reading-user` for modal data
- On-brand sage color palette

#### Book Status UX Redesign
- New model: "On My Nightstand" (active) vs "On Deck" (paused)
- Rich cards for nightstand books (cover, genre, description)
- Compact cards for on-deck books
- Empty state: "What's on your nightstand?"

#### Goodreads Import Fix
- Now correctly parses `Exclusive Shelf` column
- Maps: `read` → Collection, `currently-reading` → Reading, `to-read` → Queue

#### Data Fixes
- Heather: 123 read, 57 want-to-read, 7 currently reading
- Removed duplicate "Just Mercy" entry
- Otis: Added "Becoming Supernatural" as currently reading

#### Documentation
- Created `docs/BOOK_STATUS_UX_SPEC.md` with three-space model
- Session summaries with learnings and next steps

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Vercel Edge Functions + Supabase (PostgreSQL)
- **AI**: Claude 3.5 Sonnet (recommendations) + OpenAI (embeddings)
- **Auth**: Supabase Auth with RLS
- **Analytics**: Vercel Analytics + custom event tracking

### Key Design Decisions
- **RLS everywhere**: All user data protected by Row Level Security
- **Optimistic UI**: Instant feedback, rollback on error
- **Lazy loading**: Heavy components loaded on demand
- **DEV-only logging**: Console.logs stripped in production

### Database Tables (21)
| Category | Tables |
|----------|--------|
| Core | `reading_queue`, `taste_profiles`, `user_books`, `books` |
| Recommendations | `user_recommendations`, `shared_recommendations`, `received_recommendations`, `dismissed_recommendations` |
| Analytics | `user_events`, `book_interactions`, `search_queries`, `theme_interactions`, `user_sessions` |
| Social | `referrals`, `referral_codes` |
| Admin | `admin_notes`, `curator_waitlist`, `beta_testers` |
| AI | `reference_embeddings`, `recommendation_outcomes` |
| Chat | `chat_history` |

---

## Pending Work

### UX (Priority for Otis demo)
- [ ] Information parity: Cover images on Currently Reading cards
- [ ] Bi-directional status changes (not one-way door)
- [ ] "Set Aside" status for abandoned books

### Technical Debt
- [ ] Bundle size optimization (main chunk 918KB)
- [ ] Update `@anthropic-ai/sdk` (0.32 → 0.71)
- [ ] Expand test coverage

---

*Last updated: January 9, 2026 9:15am PT*
