# Book Status UX Reimagined

## Problem Statement

The current UX has several issues:

1. **Off-brand** - The drag-to-zone interaction feels mechanical, not warm/personal
2. **Not intuitive** - Doesn't clearly communicate that readers can have multiple books in progress
3. **Doesn't meet readers where they are** - Most new users arrive with:
   - Books they're currently reading (1-3 typically)
   - Books they've already read (their history)
   - Books they want to read (their wishlist)
   - Books they haven't discovered yet (why they're here!)

The current flow assumes users will:
1. First upload their Goodreads history
2. Then get recommendations
3. Then manage their queue

**Reality**: Most users hear about Sarah's Books, want to get recommendations, and have a hodgepodge of reading states they want to capture quickly.

---

## Proposed Solution: Three Distinct Spaces

### 1. 📖 Currently Reading
**Purpose**: What's on your nightstand right now?

- **Entry points**:
  - "What are you reading?" prompt on first visit
  - Quick-add from any book card
  - Goodreads import (currently-reading shelf)
  
- **Behavior**:
  - No hard limit (validates multi-book readers)
  - Two sub-states: **Reading Now** vs **On Hold**
  - Prominent display on home/profile
  - Easy "Finished" action → moves to Collection
  
- **Why this matters**:
  - Creates immediate engagement
  - Shows Sarah understands readers
  - Provides context for recommendations

#### Active vs On Hold Model

Most readers have books in different states of "currently reading":
- **Reading Now**: Actively making progress (1-3 books typically)
- **On Hold**: Started but paused ("I'll get back to it")

```
📖 Currently Reading

Reading Now (3)
┌─────────────────────────────────────────────────┐
│ 📕 Just Mercy                    [Finished] [⏸] │
│    by Bryan Stevenson                           │
├─────────────────────────────────────────────────┤
│ 📗 Unearthing Joy                [Finished] [⏸] │
│    by Gholdy Muhammad                           │
├─────────────────────────────────────────────────┤
│ 📘 The Power of the Reframe      [Finished] [⏸] │
│    by J.J. Bundy                                │
└─────────────────────────────────────────────────┘

On Hold (4)
┌─────────────────────────────────────────────────┐
│ 📙 Magyk                                   [▶️] │
│ 📓 Navigating PDA in America               [▶️] │
│ 📔 Healthy. Happy. Holy.                   [▶️] │
│ 📒 Motherhood Without All the Rules        [▶️] │
└─────────────────────────────────────────────────┘
```

**Interactions**:
- [⏸] Pause → moves to On Hold
- [▶️] Resume → moves to Reading Now
- [Finished] → moves to Collection

**Benefits**:
- Validates the 7-book reader without judgment
- Provides honest signal for recommendations (what are they *actually* reading?)
- Acknowledges reality: not all "currently reading" books get equal attention
- Simple mental model: "Am I actively reading this right now?"

**Database**: Add `is_active` boolean to `reading_queue` for books with `status = 'reading'`

### 2. 📚 My Collection (Books I've Read)
**Purpose**: Your reading history - the foundation for recommendations

- **Entry points**:
  - "Add books you've loved" onboarding
  - Goodreads import (read shelf)
  - Mark as "Finished" from Currently Reading
  - Quick-add from recommendations ("Already Read")
  
- **Behavior**:
  - Unlimited books
  - Optional ratings (hearts, not stars)
  - Powers recommendation engine
  
- **Why this matters**:
  - Builds taste profile
  - Creates sense of ownership
  - Enables better recommendations

### 3. 📋 Want to Read (My Queue)
**Purpose**: Books you're excited to read next

- **Entry points**:
  - Save from recommendations
  - Goodreads import (to-read shelf)
  - Manual add
  
- **Behavior**:
  - Orderable list (drag to prioritize)
  - "Start Reading" → moves to Currently Reading
  - Acquisition links (Bookshop, Libro.fm, Library)
  
- **Why this matters**:
  - Captures intent
  - Creates return visits
  - Drives affiliate revenue

---

## New User Onboarding Flow

### Option A: "What are you reading?"
```
Welcome to Sarah's Books!

📖 What are you reading right now?
[Book title input] [Add]

or

📚 Import from Goodreads
[Upload CSV]
```

### Option B: "Tell us about your reading"
```
Let's get to know you as a reader!

Step 1: What are you reading right now? (0-5 books)
Step 2: Add a few books you've loved
Step 3: Get your first recommendations
```

---

## UI/UX Principles

1. **Three clear tabs/sections** - Not a single "queue" with mixed statuses
2. **Visual distinction** - Each space has its own identity
3. **Easy movement** - One-tap to move between spaces
4. **Meet them where they are** - Don't force Goodreads import first
5. **On-brand warmth** - Personal, not transactional

---

## Technical Implementation

### Database Schema

```
reading_queue table:
├── status (existing)
│   - 'reading'      → Currently Reading
│   - 'want_to_read' → Want to Read  
│   - 'already_read' → My Collection
│   - 'finished'     → My Collection (read in-app)
│
└── is_active (NEW - boolean, default true)
    - Only applies when status = 'reading'
    - true  → "Reading Now" (actively making progress)
    - false → "On Hold" (paused, will return to it)
```

### Frontend Changes Needed
1. Replace single "Reading Queue" page with three distinct views
2. Add "Currently Reading" widget to home page
3. Redesign "Add Books" to support all three entry points
4. Update onboarding flow
5. Add Reading Now / On Hold toggle in Currently Reading section

### Backend Changes Needed
- Add `is_active` boolean column to `reading_queue` table (default: true)
- Update Goodreads import to set `is_active = true` for currently-reading books

---

## Open Questions

1. ~~Should "Currently Reading" have a limit (e.g., max 5 books)?~~ **Resolved**: No limit, use Active vs On Hold instead
2. How do we handle the transition for existing users?
3. Should we show "Currently Reading" on public profiles?
4. How does this affect the recommendation algorithm?
5. Should "On Hold" books influence recommendations differently than "Reading Now"?

---

## Next Steps

1. [ ] Design mockups for three-space navigation
2. [ ] User research: How do readers think about their books?
3. [ ] Prototype new onboarding flow
4. [ ] Plan migration for existing users

---

*Created: January 8, 2026*
*Status: Draft Spec*
