# Homepage UX Specification

## Purpose

**Help users find their next great read.**

The homepage is the primary discovery interface for Sarah's Books. It should feel personal, curated, and intelligent—not like a generic book search engine.

---

## Core Principles

1. **Lead with curation** - Our curated themes are the differentiator. They should be prominent and inviting.
2. **Feel personal** - "Ask Sarah" creates a personal connection. The AI feels like a knowledgeable friend, not a search box.
3. **Don't lose the reader** - After showing results, users should easily navigate to new searches without getting lost in scroll.
4. **Show, don't overwhelm** - Results should be scannable. Users should quickly understand why a book is recommended.

---

## Current State (What Works)

### Strengths
- **Curated themes** are prominent and visually distinct (icons, colors)
- **Genre pills** provide familiar navigation for users who know what they want
- **"Ask Sarah"** input feels personal and intelligent
- **Recommendation cards** show cover, title, author, and "why" text
- **Curator vs World badges** distinguish curated picks from AI discoveries

### Pain Points
- After search, user lands at bottom of results (scroll position issue)
- Long conversations accumulate, making it hard to "start fresh"
- "Why Sarah Recommends" text gets cut off on compact cards
- Multiple "New Search" buttons created confusion
- Incremental fixes created inconsistent UX

---

## Proposed UX Flow

### Initial State (No Search Yet)

```
┌─────────────────────────────────────────────────────────────┐
│  Sarah's Books                                    [Sign In] │
│  For the ❤️ of reading                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Sarah's avatar]                                           │
│  "Hi! I'm Sarah. Browse my curated collections below,       │
│   or tell me what you're in the mood for."                  │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  CURATED THEMES                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 📚 Women's   │ │ ☀️ Beach     │ │ ❤️ Emotional │        │
│  │ Untold       │ │ Read         │ │ Truth        │        │
│  │ Stories      │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 👥 Identity  │ │ ⚖️ Invisible │ │ ✨ Spiritual │        │
│  │ & Belonging  │ │ Injustices   │ │ Seeking      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│  Or browse by genre:                                        │
│  [Literary] [Memoir] [Mystery] [Thriller] [Romance]         │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  OR ASK SARAH                                               │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ I'm looking for...                          [Send]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### After Search (Results State)

```
┌─────────────────────────────────────────────────────────────┐
│  Sarah's Books                                    [Sign In] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ STICKY: [Themes] [Genres]              [New Search] │   │
│  │ Currently viewing: ☀️ Beach Read (highlighted)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Here are my top picks for you:                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Cover]  People We Meet on Vacation    [Curator 📚] │   │
│  │          Emily Henry • Romance                       │   │
│  │          ─────────────────────────────────────────   │   │
│  │          Why Sarah recommends: This is the ultimate  │   │
│  │          beach read - a charming story about best    │   │
│  │          friends and a transformative vacation...    │   │
│  │                                                       │   │
│  │          [Already Read] [Want to Read] [Not For Me]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Cover]  Beach Read                    [Curator 📚] │   │
│  │          Emily Henry • Romance                       │   │
│  │          ...                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│  Want something different?                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Refine: something lighter? funnier?         [Send]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Behaviors

### 1. Search Results Replace (Don't Append)
- Each new search **replaces** previous results
- No conversation history accumulates
- User always sees fresh results at the top

### 2. Scroll to Top on Results
- When results arrive, page scrolls to top
- User immediately sees the sticky filter bar + results
- No "lost at bottom" feeling

### 3. Sticky Filter Bar
- After first search, themes/genres collapse into a compact sticky bar
- Currently selected filter is **highlighted** (filled background)
- "New Search" button clears everything and returns to initial state

### 4. Recommendation Cards
- **Full "Why Sarah Recommends" text** - don't truncate the value prop
- Cover image, title, author, genre clearly visible
- Curator vs World badge distinguishes source
- Action buttons: Already Read, Want to Read, Not For Me

### 5. Refine Search Input
- After results, input placeholder changes to "Refine: something lighter? funnier?"
- Encourages iteration without losing context
- Submitting a refinement replaces results (same as new search)

---

## What NOT to Do

- ❌ Don't show conversation bubbles (Sarah avatar + user message + response)
- ❌ Don't append results to a growing chat history
- ❌ Don't have multiple "New Search" buttons
- ❌ Don't truncate "Why Sarah Recommends" text
- ❌ Don't leave user scrolled to bottom after search

---

## Implementation Checklist

- [ ] Sticky filter bar with highlighted current selection
- [ ] Replace results instead of append
- [ ] Scroll to top on new results
- [ ] Full "Why Sarah Recommends" text (no truncation)
- [ ] Remove chat bubble styling from results
- [ ] Single "New Search" button in sticky bar
- [ ] "Refine your search" placeholder after results
- [ ] Clean initial state with prominent themes

---

## Open Questions

1. Should we show a "Show me more like these" button after results?
2. Should the sticky bar include the search input, or keep it at bottom?
3. How do we handle mobile differently (smaller theme buttons)?
4. Should we track which themes/genres are most popular and surface them?

---

## Success Metrics

- **Engagement**: Users click on themes/genres (not just free-text search)
- **Discovery**: Users find books they add to their queue
- **Retention**: Users return to search again (not one-and-done)
- **Clarity**: Users understand Curator vs World distinction

---

*Last updated: January 9, 2026*
