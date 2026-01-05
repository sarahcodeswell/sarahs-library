# Reading Queue V2 - Priority Stack Spec

**Feature:** Ownership tracking + Priority ordering  
**Target:** Tomorrow's implementation  
**Estimated Time:** 2 hours

---

## Overview

Transform the reading queue from a flat list to a prioritized stack with ownership tracking.

```
📚 Next Up (Top 3)
┌─────────────────────────────────────────────────┐
│ 🥇 The Paris Wife                               │
│     Paula McLain · Historical Fiction           │
│     [✓ I Own This]  [↓ Move Down]  [✕ Remove]   │
├─────────────────────────────────────────────────┤
│ 🥈 Lessons in Chemistry                         │
│     Bonnie Garmus · Literary Fiction            │
│     [🛒 Get It]  [↓ Move Down]  [✕ Remove]      │
├─────────────────────────────────────────────────┤
│ 🥉 Tomorrow x3                                  │
│     Gabrielle Zevin · Fiction                   │
│     [✓ I Own This]  [↓ Move Down]  [✕ Remove]   │
└─────────────────────────────────────────────────┘

📋 Later
• Demon Copperhead  [🛒]  [↑]
• Fourth Wing       [✓]  [↑]
```

---

## Database Changes

### Migration File: `022_reading_queue_priority.sql`

```sql
-- Add ownership tracking
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS owned BOOLEAN DEFAULT false;

-- Add priority for ordering (lower = higher priority)
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Set initial priorities based on created_at (oldest = highest priority)
UPDATE reading_queue 
SET priority = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM reading_queue
  WHERE status = 'saved'
) as subquery
WHERE reading_queue.id = subquery.id;

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_reading_queue_priority 
ON reading_queue(user_id, status, priority);
```

---

## UI Components to Modify

### 1. `ReadingQueue.jsx` (or equivalent)

**Current structure:**
```jsx
<BookCard>
  <Cover />
  <Title />
  <Author />
  <StatusBadge /> // saved, reading, finished
</BookCard>
```

**New structure:**
```jsx
<BookCard priority={book.priority}>
  <PriorityBadge /> // 🥇🥈🥉 for top 3
  <Cover />
  <Title />
  <Author />
  <OwnershipToggle owned={book.owned} />
  <PriorityControls onMoveUp={} onMoveDown={} />
</BookCard>
```

### 2. New Components Needed

```jsx
// OwnershipToggle.jsx
<button onClick={toggleOwned}>
  {owned ? "✓ I Own This" : "🛒 Get It"}
</button>

// PriorityControls.jsx
<div>
  <button onClick={moveUp}>↑</button>
  <button onClick={moveDown}>↓</button>
</div>

// PriorityBadge.jsx
const badges = ['🥇', '🥈', '🥉'];
{priority <= 3 && <span>{badges[priority - 1]}</span>}
```

---

## API Changes

### Update `supabase.js`

```javascript
// Toggle ownership
updateBookOwnership: async (userId, bookId, owned) => {
  return supabase
    .from('reading_queue')
    .update({ owned })
    .eq('id', bookId)
    .eq('user_id', userId);
},

// Update priority
updateBookPriority: async (userId, bookId, newPriority) => {
  // Swap priorities with book at newPriority position
  // ... transaction logic
},

// Get queue ordered by priority
getReadingQueue: async (userId) => {
  return supabase
    .from('reading_queue')
    .select('*')
    .eq('user_id', userId)
    .order('status') // Group by status
    .order('priority', { ascending: true }); // Then by priority
}
```

---

## State Management

```javascript
const [queue, setQueue] = useState([]);

// Derived views
const nextUp = queue.filter(b => b.status === 'saved').slice(0, 3);
const later = queue.filter(b => b.status === 'saved').slice(3);
const reading = queue.filter(b => b.status === 'reading');
const finished = queue.filter(b => b.status === 'finished');
```

---

## Edge Cases to Handle

| Case | Behavior |
|------|----------|
| User adds new book | Default: `owned: false`, `priority: MAX + 1` |
| User clicks "Get It" | Open purchase link, show "Mark as owned?" toast |
| User moves book up | Swap priorities with book above |
| User moves top book up | No-op (already first) |
| User deletes book | Reorder priorities to fill gap |
| User starts reading | Move to "Reading" section, keep priority for later |

---

## Visual Design Notes

- **Next Up section:** Larger cards, prominent priority badges
- **Later section:** Compact list, subtle ownership indicators
- **Owned badge:** Green checkmark, subtle
- **Get It badge:** Shopping cart icon, clickable, opens affiliate link
- **Drag handles:** Consider for future (more complex)

---

## Implementation Order

1. [ ] Run database migration
2. [ ] Update `getReadingQueue` to include new columns
3. [ ] Add `OwnershipToggle` component
4. [ ] Add `updateBookOwnership` API function
5. [ ] Split queue into "Next Up" and "Later" sections
6. [ ] Add priority controls (move up/down)
7. [ ] Add `updateBookPriority` API function
8. [ ] Test all interactions
9. [ ] Deploy

---

## Files to Touch

```
supabase/migrations/022_reading_queue_priority.sql  (new)
src/lib/supabase.js                                 (update)
src/components/ReadingQueue.jsx                     (major update)
src/components/OwnershipToggle.jsx                  (new)
src/components/PriorityControls.jsx                 (new)
```

---

## Success Criteria

- [ ] User can mark books as owned/not owned
- [ ] User can see clear "Next Up" vs "Later" separation
- [ ] User can reorder priority with up/down buttons
- [ ] Ownership persists across sessions
- [ ] Priority order persists across sessions
- [ ] "Get It" opens purchase link
