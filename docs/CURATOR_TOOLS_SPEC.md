# Curator Tools Specification

## Overview

This document captures requirements for curator-specific tools and features that enhance the curator's ability to engage with readers and provide personalized book recommendations.

---

## Feature 1: Goodreads Links in Queue View

### Problem Statement

As a curator viewing a reader's queue, I can see the titles of books they've added, but I often don't know anything about books I haven't personally read. This limits my ability to provide personalized encouragement for readers with different tastes than mine.

### User Story

> As a curator, I want quick access to learn about unfamiliar books in a reader's queue (via Goodreads link) so I can provide personalized encouragement even for books I haven't read myself.

### Example Scenario

**Curator**: Sarah  
**Reader**: Amity (has different taste than Sarah)  
**Situation**: Amity has 3 books in her queue from "World Discovery" theme. Sarah doesn't recognize these titles but knows Amity is going away this weekend and has been stressed. Sarah wants to encourage Amity to read something good.

**Current State**: Sarah can only see book titles and authors - no way to quickly learn about the books.

**Desired State**: Sarah can click a Goodreads link next to each book to quickly scan reviews, ratings, and descriptions. This allows her to apply her taste in good storytelling to books she hasn't read and send a personalized note like: "This looks like a fab read! Let me know what you think."

### Requirements

1. **Goodreads Link**: Add a clickable Goodreads search link next to each book in the curator's queue view
2. **Link Format**: `https://www.goodreads.com/search?q={title}+{author}`
3. **UI Placement**: Small icon/link next to book title in the queue drill-down view
4. **Opens in New Tab**: Link should open in a new browser tab

### Technical Implementation

**Location**: `/src/components/AdminDashboard.jsx` - queue drill-down view

**Proposed Change**:
```jsx
// In the queue-user book list rendering
<a 
  href={`https://www.goodreads.com/search?q=${encodeURIComponent(b.title + ' ' + b.author)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs text-[#6B8E9C] hover:text-[#5F7252] ml-2"
  title="Look up on Goodreads"
>
  <ExternalLink className="w-3 h-3 inline" />
</a>
```

### Acceptance Criteria

- [ ] Goodreads link appears next to each book in curator's queue view
- [ ] Link opens Goodreads search in new tab
- [ ] Link is unobtrusive but easily accessible
- [ ] Works for all books (curated and non-curated)

---

## Feature 2: Reader Influence on Curator

### Problem Statement

Curators may discover great books through their readers' queues. There should be a way for curators to easily add books from a reader's queue to their own reading list.

### User Story

> As a curator, when I discover an interesting book in a reader's queue, I want to easily add it to my own reading list so I can explore books my readers enjoy.

### Requirements

1. **"Add to My Queue" Button**: Next to each book in reader's queue view
2. **Confirmation**: Brief toast notification when added
3. **Duplicate Check**: Don't add if already in curator's queue

### Status: Future Enhancement

---

## Feature 3: Curator Notes Templates

### Problem Statement

Curators often send similar types of encouragement. Having templates would speed up the process while maintaining personalization.

### User Story

> As a curator, I want access to note templates for common scenarios so I can quickly send personalized encouragement without starting from scratch each time.

### Template Categories

1. **Weekend Read**: "I see you're going away this weekend..."
2. **Stress Relief**: "I know things have been hectic..."
3. **Book Discovery**: "This looks like a fab read..."
4. **Check-In**: "How are you enjoying...?"
5. **Completion Congrats**: "Congrats on finishing..."

### Status: Future Enhancement

---

## Feature 4: Reader Activity Insights

### Problem Statement

Curators need context about reader behavior to send timely, relevant notes.

### Insights Needed

1. **Last Active**: When did the reader last use the app?
2. **Reading Pace**: How quickly do they typically finish books?
3. **Preferred Themes**: What themes do they gravitate toward?
4. **Queue Age**: How long have books been sitting in their queue?

### Status: Future Enhancement

---

## Implementation Priority

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Goodreads Links | **High** | Low | High |
| Add to My Queue | Medium | Low | Medium |
| Note Templates | Medium | Medium | Medium |
| Reader Insights | Low | High | High |

---

## Related Documentation

- `/docs/ADMIN_DASHBOARD_STATUS_TAXONOMY.md` - Status definitions
- `/docs/REFERRAL_SYSTEM.md` - Referral tracking
