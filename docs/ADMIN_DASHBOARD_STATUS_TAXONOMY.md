# Admin Dashboard Status Taxonomy

## Overview

This document defines the meaning of each status in the `reading_queue` table and how they map to the Admin Dashboard stat cards.

---

## Database Schema: `reading_queue.status`

The `reading_queue` table has a `status` column with the following valid values:

| Status | Meaning | How It's Set |
|--------|---------|--------------|
| `want_to_read` | User wants to read this book | Default when adding from recommendations |
| `reading` | User is currently reading | User marks as "currently reading" |
| `finished` | User finished reading in-app | User clicks "Mark as Read" in their queue |
| `already_read` | User already read this book | User clicks "Already Read" on a recommendation |

### Key Distinction: `finished` vs `already_read`

- **`finished`**: Book was in the user's queue and they marked it complete
- **`already_read`**: User indicated they've read this book WITHOUT it being in their queue first (e.g., from a recommendation card)

Both represent "books the user has read" but track different user journeys.

---

## Admin Dashboard Stat Cards

### Row 1: Core Stats

| Card | What It Shows | DB Query | User Journey |
|------|---------------|----------|--------------|
| **Total Users** | Registered accounts | `auth.users` count | - |
| **Books Queued** | Books users want to read | `status IN ('want_to_read', 'reading')` | User saved a book to read later |
| **Books Read** | Books finished in-app | `status = 'finished'` | User had book in queue → marked complete |
| **Books Added** | Books added to collection | `status IN ('finished', 'already_read')` | User's complete reading history |

### Row 2: Engagement Stats

| Card | What It Shows | DB Query |
|------|---------------|----------|
| **Recs Made** | Recommendations shared | `shared_recommendations` count |
| **Referrals** | User invitations | `referrals` accepted/sent |
| **Platform K-Factor** | Viral coefficient | accepted_referrals / total_users |
| **Curator Waitlist** | Pending curators | `curator_waitlist` count |
| **Beta Testers** | Read with Friends signups | `beta_testers` count |

---

## Proposed Clarification

### Option A: Keep Current (Recommended)
- **Books Queued**: `want_to_read` + `reading` (books user plans to read)
- **Books Read**: `finished` only (books completed via queue workflow)
- **Books Added**: `finished` + `already_read` (total collection / reading history)

This makes sense because:
- "Books Read" tracks the queue-to-completion funnel
- "Books Added" shows total collection size regardless of how books were added

### Option B: Rename for Clarity
- **Books Queued** → "Want to Read" 
- **Books Read** → "Finished in Queue"
- **Books Added** → "Collection" or "Total Read"

---

## User Flows

### Flow 1: Queue → Read
```
User gets recommendation → Adds to queue (want_to_read) → Reads book → Marks complete (finished)
```

### Flow 2: Already Read
```
User gets recommendation → Clicks "Already Read" (already_read) → Optionally rates
```

### Flow 3: Import from Goodreads
```
User imports CSV → Books added as (already_read) → Appear in collection
```

---

## Current Issues Identified

1. **MyCollectionPage** was only showing `finished`, not `already_read` - FIXED
2. **Admin stats** were only counting `already_read` for "Books Added" - FIXED
3. **Admin details modal** was only querying `already_read` - FIXED

---

## Recommendations

1. **Add CHECK constraint** to `reading_queue.status`:
```sql
ALTER TABLE reading_queue 
ADD CONSTRAINT reading_queue_status_check 
CHECK (status IN ('want_to_read', 'reading', 'finished', 'already_read'));
```

2. **Consider renaming** the admin card from "Books Added" to "Collection" for clarity

3. **Document in code** which statuses each component expects

---

## Related Files

- `/api/admin/stats.js` - Calculates dashboard statistics
- `/api/admin/details.js` - Fetches data for modal drill-downs
- `/src/components/AdminDashboard.jsx` - Renders stat cards
- `/src/components/MyCollectionPage.jsx` - User's collection view
- `/src/components/MyReadingQueuePage.jsx` - User's queue view
