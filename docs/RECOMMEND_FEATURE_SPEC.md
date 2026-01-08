# Recommend Feature Specification

## Overview

The Recommend feature allows users to share book recommendations with friends via shareable links. This document outlines the current state, identified issues, and proposed improvements for the sender and receiver journeys.

---

## Current State Analysis

### Database Schema

**Tables involved:**
1. `user_recommendations` - Stores the recommendation record (book, note, user_id)
2. `shared_recommendations` - Stores share links with tracking (share_token, view_count, accepted_at, accepted_by)
3. `received_recommendations` - Inbox entries for logged-in receivers (currently unused)

### Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `MyCollectionPage.jsx` | Entry point - "Recommend" button on finished books | ✅ Working |
| `RecommendationModal.jsx` | Create recommendation with personal note | ✅ Working |
| `RecommendationContext.jsx` | State management for recommendations | ✅ Working |
| `SharedRecommendationPage.jsx` | Receiver's view of shared recommendation | ✅ Working |
| `MyRecommendationsPage.jsx` | "Books I Shared" - sender's history | ⚠️ Culled |
| `BooksSharedWithMePage.jsx` | "Shared With Me" - receiver's inbox | ⚠️ Culled |

---

## Sender Journey

### Current Flow

```
1. User finishes a book → appears in Collection
2. User rates book 4-5 stars → prompt to recommend appears
3. User clicks "Recommend" button
4. RecommendationModal opens
5. User writes personal note explaining why they recommend it
6. User clicks "Create Recommendation"
7. System creates:
   - user_recommendations record
   - shared_recommendations record with share_token
8. Modal shows share link: /shared/{recommendation_id}
9. User copies link and shares externally (text, email, etc.)
```

### Issues Identified

#### 🔴 Critical: Broken Share Link Format
- **Problem:** `RecommendationModal` generates links as `/shared/{id}` 
- **But:** App routing expects `/r/{token}` format
- **Result:** Links don't work - receivers see 404 or home page

**Location:** `MyCollectionPage.jsx` line 557
```javascript
const shareLink = `${window.location.origin}/shared/${recommendationId}`;
```

**Should be:** Using the `share_token` from `shared_recommendations` table:
```javascript
const shareLink = `${window.location.origin}/r/${shareToken}`;
```

#### 🟡 Medium: No Post-Share Feedback
- After creating recommendation, sender only sees "Copy link" UI
- No confirmation that recommendation was "sent"
- No visibility into whether receiver viewed/accepted

#### 🟡 Medium: No Recommendation History
- `MyRecommendationsPage` was culled
- Sender has no way to:
  - See list of books they've recommended
  - Track view counts
  - See acceptance status
  - Re-share a recommendation

#### 🟡 Medium: Stats Exist But Are Hidden
- `UserProfile.jsx` shows "Recs Made" and "Accepted" counts
- But this data is queried by `recommender_name` string matching (fragile)
- No link to view the actual recommendations

---

## Receiver Journey

### Current Flow (When Link Works)

```
1. Receiver clicks share link (/r/{token})
2. SharedRecommendationPage loads
3. System fetches recommendation via share_token
4. View count is incremented
5. Receiver sees:
   - "{Name} thinks you'll love this book"
   - Book title and author
   - Personal note from sender
   - Book description (if available)
   - Reputation/accolades (auto-enriched)
   - Goodreads link for reviews
6. Receiver can:
   - "Add to My Reading Queue" (requires sign-in)
   - "I've Already Read This" (requires sign-in)
   - Browse purchase options (Bookshop, Audio, Library, Amazon)
7. If not logged in:
   - Value prop for Sarah's Books is shown
   - Book is stored in sessionStorage for post-signup add
8. If logged in:
   - Book is added to queue
   - shared_recommendations.accepted_at is updated
   - received_recommendations entry is created
```

### What Receiver Sees ✅

- **Personal header:** "{Name} thinks you'll love this book"
- **Book info:** Title, author
- **Personal note:** "Why {Name} thinks you'll love it:"
- **Book description:** "About this book:" with expandable text
- **Reputation:** Accolades and awards (auto-enriched)
- **Goodreads link:** "Read reviews on Goodreads"
- **Value prop:** Sarah's Books mission and features

### Issues Identified

#### 🔴 Critical: Links Don't Route Correctly
- See sender issue above - links generated as `/shared/` but routing expects `/r/`

#### 🟡 Medium: No Decline Option
- Receiver can only "Accept" or close the page
- No explicit "Not interested" or "Already read and didn't like" option
- No feedback loop to sender

#### 🟡 Medium: Sender Never Knows Outcome
- `accepted_at` is tracked in database
- But sender has no UI to see this information
- No notification system

---

## Admin Dashboard Integration

### Current Stats Tracked

**In `AdminDashboard.jsx`:**
- Total shares count
- Accepted count
- Acceptance rate percentage

**In `UserProfile.jsx`:**
- `recsMade` - Number of recommendations user has shared
- `recsAccepted` - Number that were accepted
- Acceptance rate displayed with color coding

### Data Query Method

Currently queries by `recommender_name` string matching:
```javascript
const { data: shares } = await supabase
  .from('shared_recommendations')
  .select('id, accepted_at, recommender_name')
  .or(`recommender_name.ilike.%${userName}%`);
```

**Issue:** This is fragile - if user changes display name, historical data breaks.

**Better approach:** Query by `user_recommendations.user_id` via join.

---

## Proposed Improvements

### Phase 1: Fix Critical Issues

#### 1.1 Fix Share Link Generation
**File:** `MyCollectionPage.jsx`

Change from:
```javascript
const shareLink = `${window.location.origin}/shared/${recommendationId}`;
```

To:
```javascript
// Get share token from the created recommendation
const { data } = await db.createShareLink(recommendationId, userName);
const shareLink = data?.shareUrl; // Already formatted as /r/{token}
```

Or update `RecommendationContext.jsx` to return the proper share URL.

#### 1.2 Verify Routing
**File:** `App.jsx`

Confirm routing handles `/r/{token}`:
```javascript
if (path === 'r' && pathParts[1]) {
  return { page: 'shared-recommendation', token: pathParts[1] };
}
```
✅ This appears correct - issue is link generation, not routing.

### Phase 2: Improve Sender Experience

#### 2.1 Post-Share Confirmation
After creating recommendation, show:
- ✅ "Recommendation created!"
- 📋 Copy link button
- 📱 Native share button (if available)
- 📊 "You'll see when they accept it in your profile"

#### 2.2 Recommendation History in Profile
Add section to `UserProfile.jsx`:
- List of books recommended
- For each: view count, accepted status, date
- Option to re-copy share link

#### 2.3 Better Stats Query
Change from name-based to user_id-based query:
```javascript
const { data: shares } = await supabase
  .from('shared_recommendations')
  .select(`
    id, 
    accepted_at, 
    view_count,
    user_recommendations!inner(user_id, book_title)
  `)
  .eq('user_recommendations.user_id', user.id);
```

### Phase 3: Improve Receiver Experience

#### 3.1 Add Decline Option
- "Not for me" button that:
  - Tracks decline in database
  - Optionally sends feedback to sender
  - Removes from receiver's inbox (if logged in)

#### 3.2 Notification System (Future - Read with Friends)
- When receiver accepts, sender gets notification
- Could be in-app notification or email digest

---

## Data Flow Diagram

```
SENDER                                    RECEIVER
  │                                          │
  ├─► Finish book                            │
  │   └─► Rate 4-5 stars                     │
  │       └─► "Recommend" prompt             │
  │                                          │
  ├─► Click "Recommend"                      │
  │   └─► RecommendationModal                │
  │       └─► Write personal note            │
  │           └─► "Create Recommendation"    │
  │                                          │
  │   ┌─────────────────────────────────┐    │
  │   │ user_recommendations            │    │
  │   │ - book_title, author, note      │    │
  │   │ - user_id                       │    │
  │   └─────────────────────────────────┘    │
  │                 │                        │
  │                 ▼                        │
  │   ┌─────────────────────────────────┐    │
  │   │ shared_recommendations          │    │
  │   │ - share_token                   │    │
  │   │ - recommender_name              │    │
  │   │ - view_count, accepted_at       │    │
  │   └─────────────────────────────────┘    │
  │                 │                        │
  ├─► Copy share link (/r/{token})           │
  │   └─► Share via text/email/social        │
  │                 │                        │
  │                 └────────────────────────┤
  │                                          │
  │                          Click link ◄────┤
  │                                          │
  │                    SharedRecommendationPage
  │                          │               │
  │                          ▼               │
  │                    View book details     │
  │                    Read personal note    │
  │                    See Goodreads link    │
  │                          │               │
  │                          ▼               │
  │              ┌───────────┴───────────┐   │
  │              │                       │   │
  │         "Add to Queue"        "Already Read"
  │              │                       │   │
  │              ▼                       ▼   │
  │   ┌─────────────────────────────────┐    │
  │   │ reading_queue                   │    │
  │   │ - book added with status        │    │
  │   └─────────────────────────────────┘    │
  │                 │                        │
  │                 ▼                        │
  │   ┌─────────────────────────────────┐    │
  │   │ shared_recommendations          │    │
  │   │ - accepted_at = NOW()           │    │
  │   │ - accepted_by = receiver_id     │    │
  │   └─────────────────────────────────┘    │
  │                                          │
  │   (Currently no notification)            │
  │                                          │
```

---

## Implementation Checklist

### Critical (Do First)
- [ ] Fix share link generation in `MyCollectionPage.jsx`
- [ ] Test end-to-end: create recommendation → copy link → open link → see page
- [ ] Verify `SharedRecommendationPage` loads correctly with token

### High Priority
- [ ] Add recommendation history section to UserProfile
- [ ] Fix stats query to use user_id instead of name matching
- [ ] Add "View your recommendations" link from profile stats

### Medium Priority
- [ ] Add decline option for receivers
- [ ] Improve post-share confirmation UI
- [ ] Add view count display for senders

### Future (Read with Friends)
- [ ] In-app notifications for acceptance
- [ ] Email digest of recommendation activity
- [ ] Social features: see what friends are reading
- [ ] Recommendation threads/conversations

---

## Related Documentation

- `/docs/ONBOARDING_FLOW_SPEC.md` - User authentication and onboarding
- Future: `/docs/READ_WITH_FRIENDS_SPEC.md` - Social reading features

---

## Technical Notes

### Share Token Generation
```javascript
const shareToken = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
```
- Generates ~26 character alphanumeric token
- Stored in `shared_recommendations.share_token`
- Used in URL: `/r/{shareToken}`

### Session Storage for Logged-Out Users
When receiver is not logged in and clicks "Add to Queue":
```javascript
sessionStorage.setItem('pendingRecommendation', JSON.stringify({
  book_title, book_author, book_isbn, book_description,
  status: 'want_to_read',
  shareToken
}));
```
This should be processed after sign-up to add the book automatically.

### View Count Tracking
Incremented on every page load:
```javascript
await supabase
  .from('shared_recommendations')
  .update({
    view_count: (data.view_count || 0) + 1,
    last_viewed_at: new Date().toISOString()
  })
  .eq('id', data.id);
```
